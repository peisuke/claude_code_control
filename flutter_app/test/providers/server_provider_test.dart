import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/config/app_config.dart';
import 'package:tmux_control/providers/connection_provider.dart';
import 'package:tmux_control/providers/server_provider.dart';
import 'package:tmux_control/providers/websocket_provider.dart';
import 'package:tmux_control/services/websocket_service.dart';

import '../helpers/widget_test_helpers.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  /// Helper for creating a no-init container with direct state control.
  ProviderContainer createNoInitContainer({
    HealthChecker? healthChecker,
    ServerState? initialState,
  }) {
    final mockApi = NoOpApiService();
    final container = ProviderContainer(
      overrides: [
        apiServiceProvider.overrideWithValue(mockApi),
        connectionProvider.overrideWith((ref) {
          return ConnectionNotifier(mockApi);
        }),
        wsConnectionStateProvider.overrideWith((ref) {
          return Stream.value(WsConnectionState.connected);
        }),
        websocketServiceProvider.overrideWith((ref) {
          final service = NoOpWebSocketService();
          ref.onDispose(service.dispose);
          return service;
        }),
        serverProvider.overrideWith((ref) {
          final notifier =
              ServerNotifier.noInit(ref, healthChecker: healthChecker);
          if (initialState != null) {
            notifier.debugState = initialState;
          }
          return notifier;
        }),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  /// Builds a minimal widget with the real ServerNotifier constructor
  /// (async _loadUrls) to test loading/migration. Uses testWidgets
  /// so pump() can flush async microtasks.
  Widget buildServerTestWidget({
    required HealthChecker healthChecker,
  }) {
    final mockApi = NoOpApiService();
    return ProviderScope(
      overrides: [
        apiServiceProvider.overrideWithValue(mockApi),
        connectionProvider.overrideWith((ref) {
          return ConnectionNotifier(mockApi);
        }),
        serverProvider.overrideWith((ref) {
          return ServerNotifier(ref, healthChecker: healthChecker);
        }),
        wsConnectionStateProvider.overrideWith((ref) {
          return Stream.value(WsConnectionState.connected);
        }),
        websocketServiceProvider.overrideWith((ref) {
          final service = NoOpWebSocketService();
          ref.onDispose(service.dispose);
          return service;
        }),
      ],
      child: MaterialApp(
        home: Consumer(builder: (_, ref, __) {
          final state = ref.watch(serverProvider);
          return Text('urls:${state.urls.length}');
        }),
      ),
    );
  }

  group('ServerProvider', () {
    // ── URL loading (via testWidgets for proper async flushing) ──
    group('URL loading', () {
      testWidgets('should load URLs from SharedPreferences',
          (tester) async {
        SharedPreferences.setMockInitialValues({
          AppConfig.keyBackendUrls: [
            'http://host1:8000',
            'http://host2:8000'
          ],
        });

        await tester.pumpWidget(buildServerTestWidget(
          healthChecker: (_) async => false,
        ));
        await tester.pump();
        await tester.pump();

        // Verify URLs were loaded
        expect(find.text('urls:2'), findsOneWidget);
      });

      testWidgets('should migrate from old single-URL key', (tester) async {
        SharedPreferences.setMockInitialValues({
          AppConfig.keyBackendUrl: 'http://old-host:8000',
        });

        await tester.pumpWidget(buildServerTestWidget(
          healthChecker: (_) async => false,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('urls:1'), findsOneWidget);

        // Verify migrated to new key
        final prefs = await SharedPreferences.getInstance();
        expect(prefs.getStringList(AppConfig.keyBackendUrls),
            ['http://old-host:8000']);
      });

      testWidgets('should use default URL when no URLs saved',
          (tester) async {
        SharedPreferences.setMockInitialValues({});

        await tester.pumpWidget(buildServerTestWidget(
          healthChecker: (_) async => false,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('urls:1'), findsOneWidget);
      });
    });

    // ── Health checks ───────────────────────────────────────
    group('health checks', () {
      testWidgets('should mark healthy servers as healthy', (tester) async {
        SharedPreferences.setMockInitialValues({
          AppConfig.keyBackendUrls: ['http://host1:8000'],
        });

        late WidgetRef capturedRef;
        final mockApi = NoOpApiService();
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              apiServiceProvider.overrideWithValue(mockApi),
              connectionProvider.overrideWith((ref) {
                return ConnectionNotifier(mockApi);
              }),
              serverProvider.overrideWith((ref) {
                return ServerNotifier(ref, healthChecker: (_) async => true);
              }),
              wsConnectionStateProvider.overrideWith((ref) {
                return Stream.value(WsConnectionState.connected);
              }),
              websocketServiceProvider.overrideWith((ref) {
                final service = NoOpWebSocketService();
                ref.onDispose(service.dispose);
                return service;
              }),
            ],
            child: MaterialApp(
              home: Consumer(builder: (_, ref, __) {
                capturedRef = ref;
                ref.watch(serverProvider);
                return const SizedBox();
              }),
            ),
          ),
        );
        await tester.pump();
        await tester.pump();
        await tester.pump();

        final state = capturedRef.read(serverProvider);
        expect(state.healthOf('http://host1:8000'),
            ServerHealthStatus.healthy);
      });

      testWidgets('should mark unhealthy servers as unhealthy',
          (tester) async {
        SharedPreferences.setMockInitialValues({
          AppConfig.keyBackendUrls: ['http://host1:8000'],
        });

        late WidgetRef capturedRef;
        final mockApi = NoOpApiService();
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              apiServiceProvider.overrideWithValue(mockApi),
              connectionProvider.overrideWith((ref) {
                return ConnectionNotifier(mockApi);
              }),
              serverProvider.overrideWith((ref) {
                return ServerNotifier(ref, healthChecker: (_) async => false);
              }),
              wsConnectionStateProvider.overrideWith((ref) {
                return Stream.value(WsConnectionState.connected);
              }),
              websocketServiceProvider.overrideWith((ref) {
                final service = NoOpWebSocketService();
                ref.onDispose(service.dispose);
                return service;
              }),
            ],
            child: MaterialApp(
              home: Consumer(builder: (_, ref, __) {
                capturedRef = ref;
                ref.watch(serverProvider);
                return const SizedBox();
              }),
            ),
          ),
        );
        await tester.pump();
        await tester.pump();
        await tester.pump();

        final state = capturedRef.read(serverProvider);
        expect(state.healthOf('http://host1:8000'),
            ServerHealthStatus.unhealthy);
      });

      test('should return unknown for unchecked URLs', () {
        final container = createNoInitContainer(
          initialState:
              const ServerState(urls: ['http://host1:8000']),
        );

        final state = container.read(serverProvider);
        expect(state.healthOf('http://host1:8000'),
            ServerHealthStatus.unknown);
      });
    });

    // ── Server selection ────────────────────────────────────
    group('server selection', () {
      test('should move selected server to index 0', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          initialState: const ServerState(
            urls: [
              'http://host1:8000',
              'http://host2:8000',
              'http://host3:8000'
            ],
          ),
        );

        await container.read(serverProvider.notifier).selectServer(1);

        final state = container.read(serverProvider);
        expect(state.urls, [
          'http://host2:8000',
          'http://host1:8000',
          'http://host3:8000'
        ]);
      });

      test('should ignore selectServer(0) (already active)', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          initialState: const ServerState(
            urls: ['http://host1:8000', 'http://host2:8000'],
          ),
        );

        await container.read(serverProvider.notifier).selectServer(0);

        final state = container.read(serverProvider);
        expect(state.urls, ['http://host1:8000', 'http://host2:8000']);
      });

      test('should ignore out-of-range index', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          initialState: const ServerState(
            urls: ['http://host1:8000'],
          ),
        );

        await container.read(serverProvider.notifier).selectServer(5);

        final state = container.read(serverProvider);
        expect(state.urls, ['http://host1:8000']);
      });

      test('should persist after selection', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          initialState: const ServerState(
            urls: ['http://host1:8000', 'http://host2:8000'],
          ),
        );

        await container.read(serverProvider.notifier).selectServer(1);

        final prefs = await SharedPreferences.getInstance();
        expect(prefs.getStringList(AppConfig.keyBackendUrls),
            ['http://host2:8000', 'http://host1:8000']);
      });
    });

    // ── URL add/remove ──────────────────────────────────────
    group('URL management', () {
      test('should add URL to end of list', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          healthChecker: (_) async => true,
          initialState: const ServerState(
            urls: ['http://host1:8000'],
          ),
        );

        await container
            .read(serverProvider.notifier)
            .addUrl('http://host2:8000');

        final state = container.read(serverProvider);
        expect(state.urls, ['http://host1:8000', 'http://host2:8000']);
      });

      test('should not add duplicate URL', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          healthChecker: (_) async => true,
          initialState: const ServerState(
            urls: ['http://host1:8000'],
          ),
        );

        await container
            .read(serverProvider.notifier)
            .addUrl('http://host1:8000');

        final state = container.read(serverProvider);
        expect(state.urls, ['http://host1:8000']);
      });

      test('should not add empty URL', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          initialState: const ServerState(
            urls: ['http://host1:8000'],
          ),
        );

        await container.read(serverProvider.notifier).addUrl('  ');

        final state = container.read(serverProvider);
        expect(state.urls, ['http://host1:8000']);
      });

      test('should check health of newly added URL', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          healthChecker: (_) async => true,
          initialState: const ServerState(
            urls: ['http://host1:8000'],
          ),
        );

        await container
            .read(serverProvider.notifier)
            .addUrl('http://host2:8000');

        final state = container.read(serverProvider);
        expect(state.healthOf('http://host2:8000'),
            ServerHealthStatus.healthy);
      });

      test('should remove URL by index', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          initialState: const ServerState(
            urls: ['http://host1:8000', 'http://host2:8000'],
          ),
        );

        await container.read(serverProvider.notifier).removeUrl(1);

        final state = container.read(serverProvider);
        expect(state.urls, ['http://host1:8000']);
      });

      test('should not remove when only one URL', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          initialState: const ServerState(
            urls: ['http://host1:8000'],
          ),
        );

        await container.read(serverProvider.notifier).removeUrl(0);

        final state = container.read(serverProvider);
        expect(state.urls, ['http://host1:8000']);
      });

      test('should persist after add', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          healthChecker: (_) async => true,
          initialState: const ServerState(
            urls: ['http://host1:8000'],
          ),
        );

        await container
            .read(serverProvider.notifier)
            .addUrl('http://host2:8000');

        final prefs = await SharedPreferences.getInstance();
        expect(prefs.getStringList(AppConfig.keyBackendUrls),
            ['http://host1:8000', 'http://host2:8000']);
      });

      test('should persist after remove', () async {
        SharedPreferences.setMockInitialValues({});

        final container = createNoInitContainer(
          initialState: const ServerState(
            urls: ['http://host1:8000', 'http://host2:8000'],
          ),
        );

        await container.read(serverProvider.notifier).removeUrl(1);

        final prefs = await SharedPreferences.getInstance();
        expect(prefs.getStringList(AppConfig.keyBackendUrls),
            ['http://host1:8000']);
      });
    });

    // ── activeUrl ───────────────────────────────────────────
    group('activeUrl', () {
      test('should return first URL as active', () {
        const state = ServerState(
            urls: ['http://host1:8000', 'http://host2:8000']);
        expect(state.activeUrl, 'http://host1:8000');
      });

      test('should return null when no URLs', () {
        const state = ServerState();
        expect(state.activeUrl, isNull);
      });
    });

    // ── Timer cleanup ───────────────────────────────────────
    group('timer cleanup', () {
      test('should dispose without errors', () {
        final container = createNoInitContainer(
          initialState: const ServerState(
            urls: ['http://host1:8000'],
          ),
        );

        // Disposing should cancel the timer without errors
        expect(() => container.dispose(), returnsNormally);
      });
    });
  });
}
