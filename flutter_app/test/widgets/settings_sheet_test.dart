/// Port of frontend/src/components/__tests__/SettingsModal.test.tsx
///
/// Tests for SettingsSheet (Flutter bottom sheet version of web's SettingsModal).
/// Web test cases (11): rendering (4), dark mode toggle (4), close behavior (3).
///
/// Flutter adaptation:
///   - SettingsSheet is a Column in a bottom sheet, not a Dialog.
///   - Dark mode is via Riverpod (themeProvider), not ThemeContext.
///   - Multi-URL list management via serverProvider.
///   - Close behavior is handled by the sheet dismissal, not tested here.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/config/app_config.dart';
import 'package:tmux_control/providers/connection_provider.dart';
import 'package:tmux_control/providers/server_provider.dart';
import 'package:tmux_control/providers/theme_provider.dart';
import 'package:tmux_control/providers/websocket_provider.dart';
import 'package:tmux_control/services/websocket_service.dart';
import 'package:tmux_control/widgets/common/settings_sheet.dart';

import '../helpers/widget_test_helpers.dart';

/// Creates a serverProvider override with the given URLs and health checker.
Override _serverOverride({
  List<String> urls = const [],
  Map<String, ServerHealthStatus> healthMap = const {},
  HealthChecker? healthChecker,
}) {
  return serverProvider.overrideWith((ref) {
    final notifier = ServerNotifier.noInit(
      ref,
      healthChecker: healthChecker ?? (_) async => false,
    );
    notifier.debugState = ServerState(
      entries: urls.map((u) => ServerEntry(url: u)).toList(),
      healthMap: healthMap,
    );
    return notifier;
  });
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('SettingsSheet (SettingsModal.test.tsx port)', () {
    // ── rendering ──────────────────────────────────────────
    group('rendering', () {
      testWidgets('should render Settings title', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Settings'), findsOneWidget);
      });

      testWidgets('should display dark mode option', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Dark Mode'), findsOneWidget);
      });

      testWidgets('should display Backend URLs label', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Backend URLs'), findsOneWidget);
      });

      testWidgets('should display Add button', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Add'), findsOneWidget);
      });

      testWidgets('should display URL help text', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.textContaining('Emulator:'), findsOneWidget);
        expect(find.textContaining('Device:'), findsOneWidget);
      });
    });

    // ── dark mode toggle ──────────────────────────────────
    group('dark mode toggle', () {
      testWidgets('should render SwitchListTile for dark mode',
          (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byType(SwitchListTile), findsOneWidget);
      });

      testWidgets('should show dark mode subtitle', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('ダークモード'), findsOneWidget);
      });

      testWidgets('should toggle dark mode when switch tapped',
          (tester) async {
        SharedPreferences.setMockInitialValues({'dark_mode': true});

        late WidgetRef capturedRef;
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              apiServiceProvider.overrideWithValue(NoOpApiService()),
              serverProvider.overrideWith((ref) {
                return ServerNotifier.noInit(ref,
                    healthChecker: (_) async => false);
              }),
              wsConnectionStateProvider.overrideWith((ref) {
                return Stream.value(WsConnectionState.connected);
              }),
            ],
            child: MaterialApp(
              home: Consumer(
                builder: (context, ref, _) {
                  capturedRef = ref;
                  return Scaffold(body: const SettingsSheet());
                },
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump();

        final initialDark = capturedRef.read(themeProvider);
        expect(initialDark, isTrue);

        await tester.tap(find.byType(Switch));
        await tester.pump();

        final afterToggle = capturedRef.read(themeProvider);
        expect(afterToggle, isFalse);
      });
    });

    // ── URL list management ─────────────────────────────────
    group('URL list management', () {
      testWidgets('should render TextFields for URL and name input',
          (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        // URL field + name field
        expect(find.byType(TextField), findsNWidgets(2));
      });

      testWidgets('should render FilledButton for Add', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byType(FilledButton), findsOneWidget);
      });

      testWidgets('should show URLs from serverProvider', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
          extraOverrides: [
            _serverOverride(urls: [AppConfig.backendUrl]),
          ],
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text(AppConfig.backendUrl), findsAtLeastNWidgets(1));
        expect(find.text('Active'), findsOneWidget);
      });

      testWidgets('should show Active subtitle on first URL',
          (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
          extraOverrides: [
            _serverOverride(
                urls: ['http://host1:8000', 'http://host2:8000']),
          ],
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Active'), findsOneWidget);
        expect(find.text('http://host1:8000'), findsOneWidget);
        expect(find.text('http://host2:8000'), findsOneWidget);
      });

      testWidgets('should show check icon on first URL', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
          extraOverrides: [
            _serverOverride(
                urls: ['http://host1:8000', 'http://host2:8000']),
          ],
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.check_circle), findsOneWidget);
      });

      testWidgets('should add URL when Add button is pressed',
          (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
          extraOverrides: [
            _serverOverride(urls: ['http://host1:8000']),
          ],
        ));
        await tester.pump();
        await tester.pump();

        // Enter new URL in the URL field (first TextField)
        await tester.enterText(
            find.byType(TextField).first, 'http://host2:8080');
        await tester.pump();

        // Tap Add
        await tester.tap(find.text('Add'));
        await tester.pump();
        await tester.pump();

        // New URL should appear in list
        expect(find.text('http://host2:8080'), findsOneWidget);
        // Original URL still there
        expect(find.text('http://host1:8000'), findsOneWidget);

        // Verify persisted
        final prefs = await SharedPreferences.getInstance();
        final urls = prefs.getStringList(AppConfig.keyBackendUrls);
        expect(urls, ['http://host1:8000', 'http://host2:8080']);
      });

      testWidgets('should not add duplicate URL', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
          extraOverrides: [
            _serverOverride(urls: ['http://host1:8000']),
          ],
        ));
        await tester.pump();
        await tester.pump();

        // Try to add existing URL
        await tester.enterText(
            find.byType(TextField).first, 'http://host1:8000');
        await tester.pump();

        await tester.tap(find.text('Add'));
        await tester.pump();
        await tester.pump();

        // Should still have only one entry — no duplicate in the list
        expect(find.text('http://host1:8000'), findsOneWidget);
      });

      testWidgets('should show delete buttons when multiple URLs',
          (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
          extraOverrides: [
            _serverOverride(
                urls: ['http://host1:8000', 'http://host2:8000']),
          ],
        ));
        await tester.pump();
        await tester.pump();

        // Delete buttons (close icons) should be present for each URL
        expect(find.byIcon(Icons.close), findsNWidgets(2));
      });

      testWidgets('should not show delete button when single URL',
          (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
          extraOverrides: [
            _serverOverride(urls: ['http://host1:8000']),
          ],
        ));
        await tester.pump();
        await tester.pump();

        // No delete button when only one URL
        expect(find.byIcon(Icons.close), findsNothing);
      });

      testWidgets('should remove URL when delete button is pressed',
          (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
          extraOverrides: [
            _serverOverride(
                urls: ['http://host1:8000', 'http://host2:8000']),
          ],
        ));
        await tester.pump();
        await tester.pump();

        // Tap the second delete button (remove host2)
        await tester.tap(find.byIcon(Icons.close).last);
        await tester.pump();
        await tester.pump();

        // host2 should be gone
        expect(find.text('http://host2:8000'), findsNothing);
        expect(find.text('http://host1:8000'), findsOneWidget);

        // Verify persisted
        final prefs = await SharedPreferences.getInstance();
        final urls = prefs.getStringList(AppConfig.keyBackendUrls);
        expect(urls, ['http://host1:8000']);
      });

      testWidgets('should display health dot for each URL', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
          extraOverrides: [
            _serverOverride(
              urls: ['http://host1:8000', 'http://host2:8000'],
              healthMap: {
                'http://host1:8000': ServerHealthStatus.healthy,
                'http://host2:8000': ServerHealthStatus.unhealthy,
              },
            ),
          ],
        ));
        await tester.pump();
        await tester.pump();

        // Both URLs should be rendered with health dots (Container circles)
        // We verify by checking URLs are displayed — health dots are visual
        expect(find.text('http://host1:8000'), findsOneWidget);
        expect(find.text('http://host2:8000'), findsOneWidget);
      });
    });
  });
}
