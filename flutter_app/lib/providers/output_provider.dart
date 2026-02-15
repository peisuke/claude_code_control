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

  OutputNotifier(this._api, this._target) : super(const OutputState()) {
    _fetchInitialOutput();
  }

  Future<void> _fetchInitialOutput() async {
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
      if (!mounted) return;
      // Reset prefix — will be re-extracted on next WS message.
      _historyPrefix = '';
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
