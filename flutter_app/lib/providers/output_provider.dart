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
  final bool isAtBottom;

  const OutputState({
    this.content = '',
    this.isLoadingHistory = false,
    this.totalLoadedLines = 0,
    this.isAtBottom = true,
  });

  OutputState copyWith({
    String? content,
    bool? isLoadingHistory,
    int? totalLoadedLines,
    bool? isAtBottom,
  }) {
    return OutputState(
      content: content ?? this.content,
      isLoadingHistory: isLoadingHistory ?? this.isLoadingHistory,
      totalLoadedLines: totalLoadedLines ?? this.totalLoadedLines,
      isAtBottom: isAtBottom ?? this.isAtBottom,
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

  OutputNotifier(this._api, this._target)
      : super(const OutputState()) {
    _fetchInitialOutput();
  }

  Future<void> _fetchInitialOutput() async {
    try {
      final output = await _api.getOutput(_target);
      state = state.copyWith(content: output.content, totalLoadedLines: 0);
    } catch (_) {
      // Will retry via WebSocket updates
    }
  }

  void onWebSocketMessage(TmuxOutput msg) {
    // Only update if user is at bottom (no history loaded)
    if (state.isAtBottom) {
      state = state.copyWith(content: msg.content, totalLoadedLines: 0);
    }
  }

  void setIsAtBottom(bool value) {
    state = state.copyWith(isAtBottom: value);
  }

  Future<void> loadMoreHistory() async {
    if (state.isLoadingHistory) return;
    state = state.copyWith(isLoadingHistory: true);

    try {
      final linesToLoad =
          state.totalLoadedLines + AppConfig.historyLinesPerLoad;
      final response =
          await _api.getOutput(_target, includeHistory: true, lines: linesToLoad);
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
      state = state.copyWith(
        content: output.content,
        totalLoadedLines: 0,
        isAtBottom: true,
      );
    } catch (_) {
      // ignore
    }
  }
}
