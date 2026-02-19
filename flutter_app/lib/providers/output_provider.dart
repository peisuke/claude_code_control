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

  OutputNotifier(this._api, this._target) : super(const OutputState()) {
    _fetchInitialOutput();
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

  Future<void> refresh() async {
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
      isAtBottom = true;
      state = state.copyWith(
        content: output.content,
        totalLoadedLines: 0,
      );
    } catch (_) {
      // ignore
    }
  }
}
