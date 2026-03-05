import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../models/tmux_output.dart';
import '../services/api_service.dart';
import 'connection_provider.dart';
import 'websocket_provider.dart';

class OutputState {
  final String content;
  final bool isLoadingHistory;
  final int totalLoadedLines;

  const OutputState({
    this.content = '',
    this.isLoadingHistory = false,
    this.totalLoadedLines = 0,
  });

  OutputState copyWith({
    String? content,
    bool? isLoadingHistory,
    int? totalLoadedLines,
  }) {
    return OutputState(
      content: content ?? this.content,
      isLoadingHistory: isLoadingHistory ?? this.isLoadingHistory,
      totalLoadedLines: totalLoadedLines ?? this.totalLoadedLines,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OutputState &&
          content == other.content &&
          isLoadingHistory == other.isLoadingHistory &&
          totalLoadedLines == other.totalLoadedLines;

  @override
  int get hashCode => Object.hash(content, isLoadingHistory, totalLoadedLines);
}

final selectedTargetProvider = StateProvider<String>((ref) {
  // Persist whenever the selected target changes.
  ref.listenSelf((prev, next) {
    if (prev != next) {
      SharedPreferences.getInstance().then((prefs) {
        prefs.setString(AppConfig.keySelectedTarget, next);
      });
    }
  });
  return AppConfig.savedSelectedTarget;
});

final outputProvider =
    StateNotifierProvider<OutputNotifier, OutputState>((ref) {
  final api = ref.watch(apiServiceProvider);
  final target = ref.watch(selectedTargetProvider);
  final wsService = ref.watch(websocketServiceProvider);

  final notifier = OutputNotifier(api, target);

  // Listen to WebSocket messages
  final sub = wsService.messages.listen((msg) {
    if (msg.target == target) {
      notifier.onWebSocketMessage(msg);
    }
  });

  ref.onDispose(sub.cancel);
  return notifier;
});

class OutputNotifier extends StateNotifier<OutputState> {
  final ApiService _api;
  final String _target;

  /// Synchronous flag set directly by the widget. Checked by
  /// onWebSocketMessage to decide whether to update displayed content.
  bool isAtBottom = true;

  /// Always stores the latest full content (history + live), even when
  /// the user is scrolled up.
  String _latestContent = '';

  /// History lines from initial/history load. WS messages contain only
  /// the current visible pane, so we prepend this to keep scrollback.
  String _historyPrefix = '';

  /// true after a history fetch (initial load / refreshHistory / loadMore).
  /// Set to false when a WS message brings different content, meaning
  /// the history prefix is now stale. Checked on scroll-up to decide
  /// whether to re-fetch before showing history.
  bool _historyFresh = false;

  /// Previous WS content for change detection.
  String _lastWsContent = '';

  /// Debounce timer for auto-refresh when lines shift.
  Timer? _autoRefreshTimer;

  OutputNotifier(this._api, this._target) : super(const OutputState()) {
    _fetchInitialOutput();
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchInitialOutput() async {
    if (_target.isEmpty) return;
    try {
      final lines = AppConfig.minRows * 3;
      final output = await _api.getOutput(
        _target,
        includeHistory: true,
        lines: lines,
      );
      if (!mounted) return;
      _latestContent = output.content;
      _historyPrefix = '';
      _historyFresh = true;
      state = state.copyWith(content: output.content, totalLoadedLines: 0);
    } catch (_) {
      // Will retry via WebSocket updates
    }
  }

  void onWebSocketMessage(TmuxOutput msg) {
    // First WS message after load: extract history prefix by line count.
    // Initial content = history + current screen. WS = current screen only.
    if (_historyPrefix.isEmpty && state.content.isNotEmpty) {
      final initialLines = state.content.split('\n');
      final wsLines = msg.content.split('\n');
      final historyCount = initialLines.length - wsLines.length;
      if (historyCount > 0) {
        _historyPrefix =
            '${initialLines.sublist(0, historyCount).join('\n')}\n';
      }
    }

    // Detect content change → history prefix is now stale.
    // Only invalidate while at bottom — when scrolled up, the user is
    // reading history and we don't want to re-trigger refreshHistory.
    if (_historyFresh && isAtBottom && _lastWsContent.isNotEmpty &&
        msg.content != _lastWsContent) {
      _historyFresh = false;
    }

    // Auto-refresh: when lines shift (not just typing on last line),
    // schedule a refresh to replace the stale history prefix with fresh
    // data from the API. Debounced to avoid API spam during rapid output.
    if (isAtBottom &&
        _lastWsContent.isNotEmpty &&
        _linesShifted(_lastWsContent, msg.content)) {
      _scheduleAutoRefresh();
    }

    _lastWsContent = msg.content;

    final fullContent = _historyPrefix.isEmpty
        ? msg.content
        : '$_historyPrefix${msg.content}';
    _latestContent = fullContent;

    if (isAtBottom) {
      state = state.copyWith(content: fullContent, totalLoadedLines: 0);
    }
  }

  void setScrollPosition(bool atBottom) {
    isAtBottom = atBottom;
    if (atBottom && _latestContent.isNotEmpty) {
      state = state.copyWith(content: _latestContent, totalLoadedLines: 0);
    }
  }

  /// Re-fetch 3 screens of history when the user scrolls up and the
  /// current history prefix is stale. Called from the widget's scroll
  /// handler instead of / before loadMoreHistory.
  Future<void> refreshHistory() async {
    if (_historyFresh || state.isLoadingHistory) return;
    state = state.copyWith(isLoadingHistory: true);

    try {
      final lines = AppConfig.minRows * 3;
      final output = await _api.getOutput(
        _target,
        includeHistory: true,
        lines: lines,
      );
      if (!mounted) return;
      _historyPrefix = '';
      _historyFresh = true;
      _lastWsContent = '';
      _latestContent = output.content;
      state = state.copyWith(
        content: output.content,
        totalLoadedLines: 0,
        isLoadingHistory: false,
      );
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(isLoadingHistory: false);
    }
  }

  Future<void> loadMoreHistory() async {
    // If history is stale, refresh first instead of loading more.
    if (!_historyFresh) {
      return refreshHistory();
    }
    if (state.isLoadingHistory) return;
    state = state.copyWith(isLoadingHistory: true);

    try {
      final linesToLoad =
          state.totalLoadedLines + AppConfig.historyLinesPerLoad;
      final response = await _api.getOutput(
        _target,
        includeHistory: true,
        lines: linesToLoad,
      );
      if (!mounted) return;
      _historyPrefix = '';
      _historyFresh = true;
      _lastWsContent = '';
      _latestContent = response.content;
      state = state.copyWith(
        content: response.content,
        totalLoadedLines: linesToLoad,
        isLoadingHistory: false,
      );
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(isLoadingHistory: false);
    }
  }

  /// Detect whether lines shifted between two WS frames.
  /// Returns true when non-last lines differ (= output scrolled, screen
  /// redrawn, etc.). Returns false when only the bottom of the screen
  /// changed (= user typing on the prompt, including line wrapping).
  static bool _linesShifted(String oldContent, String newContent) {
    if (oldContent == newContent) return false;
    final oldLines = oldContent.split('\n');
    final newLines = newContent.split('\n');
    // Compare the overlapping top portion, excluding the last line of the
    // shorter list. This skips the active prompt area which may wrap to
    // extra lines or change due to typing — a line-count difference alone
    // is not enough to indicate a real shift.
    final minLen =
        oldLines.length < newLines.length ? oldLines.length : newLines.length;
    if (minLen <= 1) return false;
    for (int i = 0; i < minLen - 1; i++) {
      if (oldLines[i] != newLines[i]) return true;
    }
    return false;
  }

  /// Schedule a debounced refresh (500ms). Resets on each call so rapid
  /// output only triggers one refresh after activity settles.
  void _scheduleAutoRefresh() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = Timer(const Duration(milliseconds: 500), () {
      if (mounted && isAtBottom) {
        refresh(forceBottom: false);
      }
    });
  }

  /// [forceBottom]: when true (manual refresh), always jump to bottom.
  /// When false (auto-refresh), respect current scroll position — if the
  /// user scrolled up during the API call, don't force them back down.
  Future<void> refresh({bool forceBottom = true}) async {
    try {
      final lines = AppConfig.minRows * 3;
      final output = await _api.getOutput(
        _target,
        includeHistory: true,
        lines: lines,
      );
      if (!mounted) return;
      _historyPrefix = '';
      _historyFresh = true;
      _lastWsContent = '';
      _latestContent = output.content;
      if (forceBottom) {
        isAtBottom = true;
        state = state.copyWith(
          content: output.content,
          totalLoadedLines: 0,
        );
      } else if (isAtBottom) {
        // Auto-refresh: only update displayed content if still at bottom.
        state = state.copyWith(
          content: output.content,
          totalLoadedLines: 0,
        );
      }
    } catch (_) {
      // ignore
    }
  }
}
