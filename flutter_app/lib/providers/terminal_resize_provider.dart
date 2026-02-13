import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import 'connection_provider.dart';
import 'output_provider.dart';

class TerminalSize {
  final int cols;
  final int rows;
  const TerminalSize({required this.cols, required this.rows});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TerminalSize && cols == other.cols && rows == other.rows;

  @override
  int get hashCode => cols.hashCode ^ rows.hashCode;
}

final terminalResizeProvider =
    StateNotifierProvider<TerminalResizeNotifier, TerminalSize?>((ref) {
  final api = ref.watch(apiServiceProvider);
  final target = ref.watch(selectedTargetProvider);
  return TerminalResizeNotifier(api, target);
});

class TerminalResizeNotifier extends StateNotifier<TerminalSize?> {
  final ApiService _api;
  final String _target;
  Timer? _debounceTimer;

  TerminalResizeNotifier(this._api, this._target) : super(null);

  void onContainerResize(double width, double height, double fontSize) {
    _debounceTimer?.cancel();
    _debounceTimer =
        Timer(const Duration(milliseconds: AppConfig.resizeDebounceMs), () {
      _calculateAndSend(width, height, fontSize);
    });
  }

  void _calculateAndSend(double width, double height, double fontSize) {
    if (width <= 0 || height <= 0) return;

    final charWidth = fontSize * AppConfig.charWidthRatio;
    final lineHeight = fontSize * AppConfig.lineHeightRatio;
    final padding = AppConfig.terminalPadding * 2;
    final availableWidth = width - padding;
    final availableHeight = height - padding;

    final cols = (availableWidth / charWidth).floor();
    final rows = (availableHeight / lineHeight).floor();

    final newSize = TerminalSize(
      cols: cols < AppConfig.minCols ? AppConfig.minCols : cols,
      rows: rows < AppConfig.minRows ? AppConfig.minRows : rows,
    );

    if (state != newSize) {
      state = newSize;
      _sendResize(newSize);
    }
  }

  Future<void> _sendResize(TerminalSize size) async {
    try {
      await _api.resizePane(_target, size.cols, size.rows);
    } catch (_) {
      // ignore
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }
}
