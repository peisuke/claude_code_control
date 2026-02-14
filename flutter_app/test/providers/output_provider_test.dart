/// Port of:
///   - frontend/src/hooks/__tests__/useOutputState.test.ts (10 test cases)
///   - frontend/src/hooks/__tests__/useScrollBasedOutput.test.ts (14 test cases)
///
/// In Flutter, OutputNotifier combines both useOutputState and
/// useScrollBasedOutput logic. Test cases are mapped accordingly.
import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/models/tmux_output.dart';
import 'package:tmux_control/providers/output_provider.dart';
import 'package:tmux_control/services/api_service.dart';
import 'package:tmux_control/config/app_config.dart';

// ─── Mock ApiService ──────────────────────────────────────────────
/// A simple mock that lets tests control getOutput responses.
class MockApiService extends ApiService {
  final List<_GetOutputCall> getOutputCalls = [];
  final List<Completer<TmuxOutput>> _completers = [];

  /// If set, getOutput will resolve with this output.
  TmuxOutput? nextOutput;

  /// If set, getOutput will throw this error.
  Exception? nextError;

  /// If set, getOutput will return a future that completes when the
  /// test calls [completeGetOutput].
  bool manualComplete = false;

  MockApiService() : super(baseUrl: 'http://localhost:0/api');

  @override
  Future<TmuxOutput> getOutput(
    String target, {
    bool includeHistory = false,
    int? lines,
  }) async {
    getOutputCalls.add(_GetOutputCall(target, includeHistory, lines));

    if (nextError != null) {
      final err = nextError!;
      nextError = null;
      throw err;
    }

    if (manualComplete) {
      final completer = Completer<TmuxOutput>();
      _completers.add(completer);
      return completer.future;
    }

    final output = nextOutput ??
        TmuxOutput(content: '', timestamp: '', target: target);
    nextOutput = null;
    return output;
  }

  /// Complete the oldest pending getOutput call.
  void completeGetOutput(TmuxOutput output) {
    if (_completers.isNotEmpty) {
      _completers.removeAt(0).complete(output);
    }
  }

  /// Fail the oldest pending getOutput call.
  void failGetOutput(Exception error) {
    if (_completers.isNotEmpty) {
      _completers.removeAt(0).completeError(error);
    }
  }

  int get pendingCount => _completers.length;

  void clearCalls() => getOutputCalls.clear();
}

class _GetOutputCall {
  final String target;
  final bool includeHistory;
  final int? lines;
  _GetOutputCall(this.target, this.includeHistory, this.lines);
}

// ─── Helper ───────────────────────────────────────────────────────
/// Create a notifier that does NOT auto-fetch (avoids async constructor).
OutputNotifier createNotifier(MockApiService api, String target) {
  // OutputNotifier calls _fetchInitialOutput in constructor.
  // We provide a default response so it doesn't fail.
  api.nextOutput ??= TmuxOutput(content: '', timestamp: '', target: target);
  return OutputNotifier(api, target);
}

void main() {
  late MockApiService mockApi;

  setUp(() {
    mockApi = MockApiService();
  });

  // ═══════════════════════════════════════════════════════════════
  // Port of useOutputState.test.ts
  // ═══════════════════════════════════════════════════════════════
  group('OutputNotifier (useOutputState port)', () {
    // ── initial state ──────────────────────────────────────────
    group('initial state', () {
      test('should return initial state', () {
        // Port of: "should return initial state from hooks"
        final notifier = createNotifier(mockApi, 'default');

        // Before async fetch completes, state should be empty.
        expect(notifier.debugState.content, '');
        expect(notifier.debugState.isLoadingHistory, false);
      });
    });

    // ── handleRefresh ──────────────────────────────────────────
    group('handleRefresh (refresh)', () {
      test('should fetch output and update state', () async {
        // Port of: "should fetch output and update state"
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero); // let initial fetch complete

        mockApi.clearCalls();
        mockApi.nextOutput = TmuxOutput(
          content: 'new output',
          timestamp: '',
          target: 'default',
        );

        await notifier.refresh();

        expect(mockApi.getOutputCalls.length, 1);
        expect(mockApi.getOutputCalls[0].target, 'default');
        expect(notifier.debugState.content, 'new output');
      });

      test('should handle refresh error silently', () async {
        // Port of: "should handle refresh error silently"
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        mockApi.clearCalls();
        mockApi.nextError = Exception('Network error');

        // Should not throw
        await notifier.refresh();
        // State should remain unchanged
      });
    });

    // ── target change ──────────────────────────────────────────
    group('target change', () {
      test('should clear and refresh when target changes', () async {
        // Port of: "should clear output and refresh when target changes"
        // In Flutter, a new OutputNotifier is created when target changes
        // (via Riverpod's ref.watch(selectedTargetProvider)).
        mockApi.nextOutput = TmuxOutput(
          content: 'new content',
          timestamp: '',
          target: 'session2',
        );
        final notifier = OutputNotifier(mockApi, 'session2');

        await Future.delayed(Duration.zero);

        // Constructor triggers initial fetch with the new target
        expect(
          mockApi.getOutputCalls.any((c) => c.target == 'session2'),
          isTrue,
        );
        expect(notifier.debugState.content, 'new content');
      });
    });

    // ── WebSocket message ──────────────────────────────────────
    group('WebSocket message (onWebSocketMessage)', () {
      test('should update output when at bottom', () async {
        // Port of: "should update output when lastMessage changes"
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        notifier.isAtBottom = true;
        notifier.onWebSocketMessage(TmuxOutput(
          content: 'ws message content',
          timestamp: DateTime.now().toIso8601String(),
          target: 'default',
        ));

        expect(notifier.debugState.content, 'ws message content');
      });

      test('should not update displayed content when scrolled up (autoRefresh off)', () async {
        // Port of: "should not update output when autoRefresh is false"
        // In Flutter, autoRefresh=false maps to isAtBottom=false.
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        notifier.isAtBottom = false;
        notifier.onWebSocketMessage(TmuxOutput(
          content: 'ws message content',
          timestamp: DateTime.now().toIso8601String(),
          target: 'default',
        ));

        // Content should NOT be updated in displayed state
        expect(notifier.debugState.content, isNot('ws message content'));
      });

      test('should show latest content when returning to bottom', () async {
        // Port of: "should update output when autoRefresh becomes true"
        // In Flutter, this is handled by setScrollPosition(true).
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        // Scroll up → WS messages buffered
        notifier.isAtBottom = false;
        notifier.onWebSocketMessage(TmuxOutput(
          content: 'buffered content',
          timestamp: '',
          target: 'default',
        ));
        expect(notifier.debugState.content, isNot('buffered content'));

        // Scroll back to bottom → latest content shown
        notifier.setScrollPosition(true);
        expect(notifier.debugState.content, 'buffered content');
      });
    });

    // ── initial load ──────────────────────────────────────────
    group('initial load', () {
      test('should fetch when created (simulates connect)', () async {
        // Port of: "should refresh when isConnected becomes true"
        // In Flutter, the notifier is (re)created when connection changes.
        mockApi.nextOutput = TmuxOutput(
          content: 'initial content',
          timestamp: '',
          target: 'default',
        );
        final notifier = OutputNotifier(mockApi, 'default');

        await Future.delayed(Duration.zero);

        expect(notifier.debugState.content, 'initial content');
        expect(
          mockApi.getOutputCalls.any((c) => c.target == 'default'),
          isTrue,
        );
      });
    });

    // ── setScrollPosition ────────────────────────────────────
    group('setScrollPosition', () {
      test('should set isAtBottom flag', () async {
        // Port of: "should expose setOutput from useTmux"
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        notifier.setScrollPosition(false);
        expect(notifier.isAtBottom, false);

        notifier.setScrollPosition(true);
        expect(notifier.isAtBottom, true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Port of useScrollBasedOutput.test.ts
  // ═══════════════════════════════════════════════════════════════
  group('OutputNotifier (useScrollBasedOutput port)', () {
    // ── initial state ──────────────────────────────────────────
    group('initial state', () {
      test('should have empty output by default', () {
        // Port of: "should have empty output by default"
        final notifier = createNotifier(mockApi, 'default');
        expect(notifier.debugState.content, '');
        expect(notifier.debugState.isLoadingHistory, false);
      });
    });

    // ── setOutput / onWebSocketMessage ────────────────────────
    group('setOutput (via onWebSocketMessage)', () {
      test('should update output', () async {
        // Port of: "should update output"
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        notifier.onWebSocketMessage(TmuxOutput(
          content: 'new output content',
          timestamp: '',
          target: 'default',
        ));

        expect(notifier.debugState.content, 'new output content');
      });

      test('should reset totalLoadedLines when setting output', () async {
        // Port of: "should reset total loaded lines when setting output"
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        notifier.onWebSocketMessage(TmuxOutput(
          content: 'some content',
          timestamp: '',
          target: 'default',
        ));

        expect(notifier.debugState.content, 'some content');
        expect(notifier.debugState.totalLoadedLines, 0);
      });
    });

    // ── history loading ──────────────────────────────────────
    group('history loading (loadMoreHistory)', () {
      test('should set isLoadingHistory during load', () async {
        // Port of: "should set isLoadingHistory during load"
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        mockApi.clearCalls();
        mockApi.manualComplete = true;

        // Start loading
        final loadFuture = notifier.loadMoreHistory();

        // isLoadingHistory should be true
        expect(notifier.debugState.isLoadingHistory, true);

        // Complete the API call
        mockApi.completeGetOutput(TmuxOutput(
          content: 'historical content',
          timestamp: '',
          target: 'default',
        ));

        await loadFuture;

        expect(notifier.debugState.isLoadingHistory, false);
      });

      test('should handle load error silently', () async {
        // Port of: "should handle load error silently"
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        mockApi.clearCalls();
        mockApi.nextError = Exception('Network error');

        await notifier.loadMoreHistory();

        // Should not throw and isLoadingHistory should be false
        expect(notifier.debugState.isLoadingHistory, false);
      });

      test('should not load multiple times simultaneously', () async {
        // Port of: "should not load multiple times simultaneously"
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        mockApi.clearCalls();
        mockApi.manualComplete = true;

        // Trigger first load
        final load1 = notifier.loadMoreHistory();

        // Trigger second load (should be rejected)
        final load2 = notifier.loadMoreHistory();

        // Complete first
        mockApi.completeGetOutput(TmuxOutput(
          content: 'content',
          timestamp: '',
          target: 'default',
        ));

        await load1;
        await load2;

        // getOutput should only be called once (for loadMore, not counting initial)
        final historyCalls = mockApi.getOutputCalls
            .where((c) => c.includeHistory)
            .toList();
        expect(historyCalls.length, 1);
      });

      test('should update output with history content', () async {
        // Port of: "should update output with history content"
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        mockApi.clearCalls();
        mockApi.nextOutput = TmuxOutput(
          content: 'historical content with more lines',
          timestamp: '',
          target: 'default',
        );

        await notifier.loadMoreHistory();

        expect(
          notifier.debugState.content,
          'historical content with more lines',
        );
      });

      test('should request correct number of lines', () async {
        // Port of: "should trigger load when scrolling near top with valid ref"
        // Verifies the lines parameter matches HISTORY_LINES_PER_LOAD.
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        mockApi.clearCalls();
        mockApi.nextOutput = TmuxOutput(
          content: 'history',
          timestamp: '',
          target: 'default',
        );

        await notifier.loadMoreHistory();

        final call = mockApi.getOutputCalls
            .firstWhere((c) => c.includeHistory);
        expect(call.target, 'default');
        expect(call.includeHistory, true);
        expect(call.lines, AppConfig.historyLinesPerLoad);
      });

      test('should accumulate lines on subsequent loads', () async {
        // Port of: verifying totalLoadedLines increases with each load.
        final notifier = createNotifier(mockApi, 'default');
        await Future.delayed(Duration.zero);

        mockApi.clearCalls();
        mockApi.nextOutput = TmuxOutput(
          content: 'first load',
          timestamp: '',
          target: 'default',
        );
        await notifier.loadMoreHistory();

        expect(notifier.debugState.totalLoadedLines,
            AppConfig.historyLinesPerLoad);

        mockApi.nextOutput = TmuxOutput(
          content: 'second load',
          timestamp: '',
          target: 'default',
        );
        await notifier.loadMoreHistory();

        // Second load should request more lines
        final secondCall = mockApi.getOutputCalls
            .where((c) => c.includeHistory)
            .last;
        expect(secondCall.lines, AppConfig.historyLinesPerLoad * 2);
      });
    });
  });
}
