import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
}

final selectedTargetProvider = StateProvider<String>((ref) => 'default');

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
  /// This avoids the Riverpod state propagation delay that caused
  /// the race condition.
  bool isAtBottom = true;

  /// Always stores the latest WebSocket content, even when the user
  /// is scrolled up. When the user returns to bottom we show this
  /// immediately without waiting for the next WebSocket message.
  String _latestContent = '';

  OutputNotifier(this._api, this._target) : super(const OutputState()) {
    _fetchInitialOutput();
  }

  Future<void> _fetchInitialOutput() async {
    try {
      final output = await _api.getOutput(_target);
      _latestContent = output.content;
      state = state.copyWith(content: output.content, totalLoadedLines: 0);
    } catch (_) {
      // Will retry via WebSocket updates
    }
  }

  void onWebSocketMessage(TmuxOutput msg) {
    _latestContent = msg.content;
    // Only update displayed content when user is at bottom.
    if (isAtBottom) {
      state = state.copyWith(content: msg.content, totalLoadedLines: 0);
    }
  }

  /// Called by the widget when scroll position crosses the threshold.
  /// When scrolling UP: just sets the flag. No Riverpod state change,
  /// so no unnecessary widget rebuild.
  /// When scrolling back to BOTTOM: updates state with latest content.
  void setScrollPosition(bool atBottom) {
    isAtBottom = atBottom;
    if (atBottom && _latestContent.isNotEmpty) {
      state = state.copyWith(content: _latestContent, totalLoadedLines: 0);
    }
  }

  Future<void> loadMoreHistory() async {
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
      state = state.copyWith(
        content: response.content,
        totalLoadedLines: linesToLoad,
        isLoadingHistory: false,
      );
    } catch (_) {
      state = state.copyWith(isLoadingHistory: false);
    }
  }

  Future<void> refresh() async {
    try {
      final output = await _api.getOutput(_target);
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
