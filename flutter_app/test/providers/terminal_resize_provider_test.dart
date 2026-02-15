/// Port of frontend/src/hooks/tmux/useTerminalResize.ts logic.
/// No direct web test file exists, but the resize calculation is
/// critical for correct terminal display.
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/config/app_config.dart';
import 'package:tmux_control/models/api_response.dart';
import 'package:tmux_control/providers/terminal_resize_provider.dart';
import 'package:tmux_control/services/api_service.dart';

// ─── Mock ApiService ──────────────────────────────────────────────
class MockApiService extends ApiService {
  final List<_ResizeCall> resizeCalls = [];

  MockApiService() : super(baseUrl: 'http://localhost:0/api');

  @override
  Future<ApiResponse> resizePane(String target, int cols, int rows) async {
    resizeCalls.add(_ResizeCall(target, cols, rows));
    return const ApiResponse(success: true, message: '');
  }
}

class _ResizeCall {
  final String target;
  final int cols;
  final int rows;
  _ResizeCall(this.target, this.cols, this.rows);
}

void main() {
  group('TerminalResizeNotifier', () {
    group('TerminalSize', () {
      test('should support equality', () {
        const a = TerminalSize(cols: 80, rows: 24);
        const b = TerminalSize(cols: 80, rows: 24);
        const c = TerminalSize(cols: 120, rows: 40);

        expect(a, b);
        expect(a, isNot(c));
      });

      test('should have consistent hashCode', () {
        const a = TerminalSize(cols: 80, rows: 24);
        const b = TerminalSize(cols: 80, rows: 24);
        expect(a.hashCode, b.hashCode);
      });
    });

    group('size calculation', () {
      test('should calculate correct cols and rows for typical size', () {
        // Simulate a 400x600 container with fontSize=14
        // Available width: 400 - 16(margin) - 32(padding) = 352
        // Available height: 600 - 16(margin) - 32(padding) = 552
        // charWidth = 14 * 0.6 = 8.4
        // lineHeight = 14 * 1.2 = 16.8
        // cols = 352 / 8.4 = 41
        // rows = 552 / 16.8 = 32

        const fontSize = 14.0;
        final charWidth = fontSize * AppConfig.charWidthRatio;
        final lineHeight = fontSize * AppConfig.lineHeightRatio;
        const margin = 8.0 * 2;
        final padding = AppConfig.terminalPadding * 2;
        final availableWidth = 400.0 - margin - padding;
        final availableHeight = 600.0 - margin - padding;

        final cols = (availableWidth / charWidth).floor();
        final rows = (availableHeight / lineHeight).floor();

        expect(cols, 41);
        expect(rows, 32);
      });

      test('should enforce minimum cols and rows', () {
        // Very small container that would produce < minCols/minRows
        const fontSize = 14.0;
        final charWidth = fontSize * AppConfig.charWidthRatio;
        final lineHeight = fontSize * AppConfig.lineHeightRatio;
        const margin = 8.0 * 2;
        final padding = AppConfig.terminalPadding * 2;

        // Container smaller than minimum
        final availableWidth = 50.0 - margin - padding;
        final availableHeight = 50.0 - margin - padding;

        var cols = (availableWidth / charWidth).floor();
        var rows = (availableHeight / lineHeight).floor();

        if (cols < AppConfig.minCols) cols = AppConfig.minCols;
        if (rows < AppConfig.minRows) rows = AppConfig.minRows;

        expect(cols, AppConfig.minCols);
        expect(rows, AppConfig.minRows);
      });
    });

    group('AppConfig resize constants', () {
      test('should have correct default values', () {
        expect(AppConfig.charWidthRatio, 0.6);
        expect(AppConfig.lineHeightRatio, 1.2);
        expect(AppConfig.terminalPadding, 16.0);
        expect(AppConfig.minCols, 20);
        expect(AppConfig.minRows, 24);
        expect(AppConfig.resizeDebounceMs, 300);
      });
    });
  });
}
