/// Port of frontend/src/components/__tests__/SettingsModal.test.tsx
///
/// Tests for SettingsSheet (Flutter bottom sheet version of web's SettingsModal).
/// Web test cases (11): rendering (4), dark mode toggle (4), close behavior (3).
///
/// Flutter adaptation:
///   - SettingsSheet is a Column in a bottom sheet, not a Dialog.
///   - Dark mode is via Riverpod (themeProvider), not ThemeContext.
///   - URL input + Save button replaces web's inline form.
///   - Close behavior is handled by the sheet dismissal, not tested here.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/providers/connection_provider.dart';
import 'package:tmux_control/providers/theme_provider.dart';
import 'package:tmux_control/providers/websocket_provider.dart';
import 'package:tmux_control/services/websocket_service.dart';
import 'package:tmux_control/widgets/common/settings_sheet.dart';

import '../helpers/widget_test_helpers.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('SettingsSheet (SettingsModal.test.tsx port)', () {
    // ── rendering ──────────────────────────────────────────
    group('rendering', () {
      testWidgets('should render Settings title', (tester) async {
        // Port of: "should render when isOpen is true"
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Settings'), findsOneWidget);
      });

      testWidgets('should display dark mode option', (tester) async {
        // Port of: "should display dark mode option"
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Dark Mode'), findsOneWidget);
      });

      testWidgets('should display Backend URL label', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Backend URL'), findsOneWidget);
      });

      testWidgets('should display Save button', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Save'), findsOneWidget);
      });

      testWidgets('should display URL help text', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        // Help text below the URL field includes emulator/device hints.
        // The URL also appears in the TextField controller (loaded from prefs).
        expect(find.textContaining('Emulator:'), findsOneWidget);
        expect(find.textContaining('Device:'), findsOneWidget);
      });
    });

    // ── dark mode toggle ──────────────────────────────────
    group('dark mode toggle', () {
      testWidgets('should render SwitchListTile for dark mode',
          (tester) async {
        // Port of: "should show switch as unchecked/checked"
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
        // Port of: "should call setDarkMode with true when toggling on"
        SharedPreferences.setMockInitialValues({'dark_mode': true});

        late WidgetRef capturedRef;
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              apiServiceProvider.overrideWithValue(NoOpApiService()),
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

        // Verify initial state
        final initialDark = capturedRef.read(themeProvider);
        expect(initialDark, isTrue);

        // Tap the switch
        await tester.tap(find.byType(Switch));
        await tester.pump();

        // Dark mode should have toggled
        final afterToggle = capturedRef.read(themeProvider);
        expect(afterToggle, isFalse);
      });
    });

    // ── URL input ──────────────────────────────────────────
    group('URL input', () {
      testWidgets('should render TextField for URL', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byType(TextField), findsOneWidget);
      });

      testWidgets('should accept URL text input', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        await tester.enterText(
            find.byType(TextField), 'http://192.168.1.100:8080');
        await tester.pump();

        expect(find.text('http://192.168.1.100:8080'), findsOneWidget);
      });

      testWidgets('should render FilledButton for Save', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const SettingsSheet(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byType(FilledButton), findsOneWidget);
      });
    });
  });
}
