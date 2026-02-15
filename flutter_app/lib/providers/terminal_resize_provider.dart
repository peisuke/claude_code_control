import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import '../widgets/terminal/terminal_output.dart' show addDebugLog;
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
    // Container margin (8 each side) + ListView padding (16 each side)
    const margin = 8.0 * 2;
    final padding = AppConfig.terminalPadding * 2;
    final availableWidth = width - margin - padding;
    final availableHeight = height - margin - padding;

    final cols = (availableWidth / charWidth).floor();
    final rows = (availableHeight / lineHeight).floor();

    final newSize = TerminalSize(
      cols: cols < AppConfig.minCols ? AppConfig.minCols : cols,
      rows: rows < AppConfig.minRows ? AppConfig.minRows : rows,
    );

    if (state != newSize) {
      state = newSize;
      addDebugLog('RSZ ${newSize.cols}x${newSize.rows} t=$_target');
      _sendResize(newSize);
    }
  }

  Future<void> _sendResize(TerminalSize size) async {
    try {
      await _api.resizePane(_target, size.cols, size.rows);
      addDebugLog('RSZ:OK ${size.cols}x${size.rows}');
    } catch (e) {
      addDebugLog('RSZ:ERR $e');
      // Web: lastSizeRef.current = previousSize — reset so retry works
      state = null;
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }
}
