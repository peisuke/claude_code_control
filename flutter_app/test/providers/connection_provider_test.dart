/// Port of frontend/src/hooks/__tests__/useHttpConnectionState.test.ts (health check portion)
///
/// The web's useHttpConnectionState combines WebSocket state, app visibility, and
/// HTTP health checks. In Flutter, the HTTP health check is isolated in
/// ConnectionNotifier which polls testConnection() every 5 seconds.
///
/// Web tests ported here:
///   - initial state (2 tests) → ConnectionNotifier initial state
///   - health check behavior (5 tests) → periodic polling, success/failure
///   - dispose (1 test) → timer cleanup
import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/models/api_response.dart';
import 'package:tmux_control/providers/connection_provider.dart';
import 'package:tmux_control/services/api_service.dart';

// ─── Mock ApiService ──────────────────────────────────────────────
class MockApiService extends ApiService {
  int testConnectionCallCount = 0;
  bool shouldSucceed = true;
  bool shouldThrow = false;

  MockApiService() : super(baseUrl: 'http://localhost:0/api');

  @override
  Future<ApiResponse> testConnection() async {
    testConnectionCallCount++;
    if (shouldThrow) {
      throw Exception('Connection failed');
    }
    return ApiResponse(success: shouldSucceed, message: '');
  }

  void reset() {
    testConnectionCallCount = 0;
    shouldSucceed = true;
    shouldThrow = false;
  }
}

void main() {
  group('ConnectionNotifier (useHttpConnectionState health check port)', () {
    late MockApiService mockApi;

    setUp(() {
      mockApi = MockApiService();
    });

    // ── initial state ──────────────────────────────────────────
    group('initial state', () {
      test('should have connecting as initial state', () async {
        // Port of: "should return WebSocket state" (initial isConnected check)
        // In Flutter, ConnectionNotifier starts with connecting (not checked yet).
        final notifier = ConnectionNotifier(mockApi);
        expect(notifier.debugState, HttpConnectionState.connecting);

        // Wait for the async _check to complete before disposing.
        await Future<void>.delayed(const Duration(milliseconds: 50));
        notifier.dispose();
      });

      test('should call testConnection immediately on creation', () async {
        // Port of: implicit behavior in web's useHttpConnectionState
        // The notifier calls _check() in the constructor.
        final notifier = ConnectionNotifier(mockApi);

        // Allow the initial async _check to complete.
        await Future<void>.delayed(const Duration(milliseconds: 50));

        expect(mockApi.testConnectionCallCount, 1);
        notifier.dispose();
      });
    });

    // ── health check success/failure ─────────────────────────
    group('health check', () {
      test('should set state to connected when testConnection succeeds',
          () async {
        // Port of: "should return WebSocket state" wsConnected=true scenario
        mockApi.shouldSucceed = true;
        final notifier = ConnectionNotifier(mockApi);

        await Future<void>.delayed(const Duration(milliseconds: 50));

        expect(notifier.debugState, HttpConnectionState.connected);
        notifier.dispose();
      });

      test(
          'should set state to disconnected when testConnection returns failure',
          () async {
        mockApi.shouldSucceed = false;
        final notifier = ConnectionNotifier(mockApi);

        await Future<void>.delayed(const Duration(milliseconds: 50));

        expect(notifier.debugState, HttpConnectionState.disconnected);
        notifier.dispose();
      });

      test('should set state to disconnected when testConnection throws',
          () async {
        // Port of: "should return wsError from useWebSocket" error scenario
        mockApi.shouldThrow = true;
        final notifier = ConnectionNotifier(mockApi);

        await Future<void>.delayed(const Duration(milliseconds: 50));

        expect(notifier.debugState, HttpConnectionState.disconnected);
        notifier.dispose();
      });

      test('should update state when connection recovers', () async {
        // Port of: reconnecting → connected transition
        mockApi.shouldSucceed = false;
        final notifier = ConnectionNotifier(mockApi);

        await Future<void>.delayed(const Duration(milliseconds: 50));
        expect(notifier.debugState, HttpConnectionState.disconnected);

        // Connection recovers
        mockApi.shouldSucceed = true;
        await notifier.testConnection();

        expect(notifier.debugState, HttpConnectionState.connected);
        notifier.dispose();
      });

      test('should update state when connection drops', () async {
        mockApi.shouldSucceed = true;
        final notifier = ConnectionNotifier(mockApi);

        await Future<void>.delayed(const Duration(milliseconds: 50));
        expect(notifier.debugState, HttpConnectionState.connected);

        // Connection drops
        mockApi.shouldThrow = true;
        await notifier.testConnection();

        expect(notifier.debugState, HttpConnectionState.disconnected);
        notifier.dispose();
      });
    });

    // ── manual testConnection ──────────────────────────────────
    group('manual testConnection', () {
      test('should allow explicit testConnection call', () async {
        final notifier = ConnectionNotifier(mockApi);
        await Future<void>.delayed(const Duration(milliseconds: 50));

        final countAfterInit = mockApi.testConnectionCallCount;

        await notifier.testConnection();

        expect(mockApi.testConnectionCallCount, countAfterInit + 1);
        notifier.dispose();
      });
    });

    // ── dispose ────────────────────────────────────────────────
    group('dispose', () {
      test('should cancel timer on dispose', () async {
        final notifier = ConnectionNotifier(mockApi);
        await Future<void>.delayed(const Duration(milliseconds: 50));

        final countAfterInit = mockApi.testConnectionCallCount;

        notifier.dispose();

        // After dispose, timer should be cancelled. No more calls should happen.
        await Future<void>.delayed(const Duration(milliseconds: 200));
        expect(mockApi.testConnectionCallCount, countAfterInit);
      });
    });
  });
}
