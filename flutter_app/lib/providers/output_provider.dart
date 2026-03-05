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

  /// Guard: true while an auto-refresh API call is in flight.
  bool _isAutoRefreshing = false;

  /// true when a line-shift event was detected while _isAutoRefreshing
  /// was true.  Checked after the in-flight refresh completes to
  /// schedule a follow-up refresh.
  bool _refreshPending = false;

  /// Incremented on every WS message. Used by auto-refresh to detect
  /// whether fresher WS data arrived during an async API call.
  int _wsVersion = 0;

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
    _wsVersion++;

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
  /// Returns true when any of the first 3 lines changed — meaning output
  /// scrolled and the old top lines moved into the scrollback buffer.
  /// Comparing multiple lines avoids false negatives when the first line
  /// happens to be identical (e.g. repeated log prefixes).
  /// Returns false for prompt typing, wrapping, or pasting, which only
  /// affect the bottom of the visible pane (top lines stay the same).
  static bool _linesShifted(String oldContent, String newContent) {
    if (oldContent == newContent) return false;
    final oldLines = oldContent.split('\n');
    final newLines = newContent.split('\n');
    final checkCount = 3;
    for (var i = 0; i < checkCount; i++) {
      final oldLine = i < oldLines.length ? oldLines[i] : '';
      final newLine = i < newLines.length ? newLines[i] : '';
      if (oldLine != newLine) return true;
    }
    return false;
  }

  /// Schedule a debounced refresh (500ms). Resets on each call so rapid
  /// output only triggers one refresh after activity settles.
  /// When an auto-refresh is already in flight, records the request so
  /// a follow-up refresh runs after the current one completes.
  void _scheduleAutoRefresh() {
    if (_isAutoRefreshing) {
      _refreshPending = true;
      return;
    }
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = Timer(const Duration(milliseconds: 500), () {
      if (mounted && isAtBottom && !_isAutoRefreshing) {
        _autoRefresh();
      }
    });
  }

  /// Wrapper around refresh(forceBottom: false) with an in-flight guard.
  /// After completion, checks whether a follow-up refresh is needed
  /// (new shift events arrived during the call).
  Future<void> _autoRefresh() async {
    _isAutoRefreshing = true;
    _refreshPending = false;
    try {
      await refresh(forceBottom: false);
    } finally {
      _isAutoRefreshing = false;
      // Only retry when new line-shift events arrived during the call.
      // Do NOT retry on !_historyFresh alone — that would cause an
      // endless retry loop if the API keeps failing or the WS-during-call
      // branch always leaves history stale.
      if (mounted && isAtBottom && _refreshPending) {
        _refreshPending = false;
        _scheduleAutoRefresh();
      }
    }
  }

  /// [forceBottom]: when true (manual refresh), always jump to bottom.
  /// When false (auto-refresh), respect current scroll position — if the
  /// user scrolled up during the API call, don't force them back down.
  Future<void> refresh({bool forceBottom = true}) async {
    final wsVersionBefore = _wsVersion;
    try {
      final lines = AppConfig.minRows * 3;
      final output = await _api.getOutput(
        _target,
        includeHistory: true,
        lines: lines,
      );
      if (!mounted) return;

      if (forceBottom) {
        _historyPrefix = '';
        _historyFresh = true;
        _lastWsContent = '';
        _latestContent = output.content;
        isAtBottom = true;
        state = state.copyWith(
          content: output.content,
          totalLoadedLines: 0,
        );
      } else if (_wsVersion > wsVersionBefore && _lastWsContent.isNotEmpty) {
        // WS messages arrived during the API call — _lastWsContent is
        // fresher than the API snapshot for the visible pane.  Extract
        // only the history portion from the API response and combine it
        // with the latest WS content to avoid overwriting newer data.
        //
        // Note: lines that scrolled off the pane *after* the API snapshot
        // but *before* the latest WS frame are in neither source.  We
        // keep _historyFresh = false so the next auto-refresh or
        // scroll-up will re-fetch a complete snapshot.
        final apiLines = output.content.split('\n');
        final wsLines = _lastWsContent.split('\n');
        final historyCount = apiLines.length - wsLines.length;
        if (historyCount > 0) {
          _historyPrefix =
              '${apiLines.sublist(0, historyCount).join('\n')}\n';
        } else {
          _historyPrefix = '';
        }
        // Intentionally NOT setting _historyFresh = true here — the
        // spliced history may have gaps from lines emitted during the
        // API call.  Keeping it false lets subsequent refreshes or
        // scroll-up actions re-fetch a clean snapshot.
        final fullContent = _historyPrefix.isEmpty
            ? _lastWsContent
            : '$_historyPrefix$_lastWsContent';
        _latestContent = fullContent;
        if (isAtBottom) {
          state = state.copyWith(
            content: fullContent,
            totalLoadedLines: 0,
          );
        }
      } else if (_wsVersion == wsVersionBefore && isAtBottom) {
        // No WS messages during API call (_wsVersion unchanged) — the API
        // response is the freshest data available, safe to apply directly.
        _historyPrefix = '';
        _historyFresh = true;
        _lastWsContent = '';
        _latestContent = output.content;
        state = state.copyWith(
          content: output.content,
          totalLoadedLines: 0,
        );
      } else {
        // User scrolled up — update internal state only.
        _historyPrefix = '';
        _historyFresh = true;
        _lastWsContent = '';
        _latestContent = output.content;
      }
    } catch (_) {
      // ignore
    }
  }
}
