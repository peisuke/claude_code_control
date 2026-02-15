/// Port of frontend/src/components/terminal/__tests__/TmuxKeyboard.test.tsx
///
/// Tests for the TmuxKeyboard widget which renders 4 keyboard shortcut buttons:
///   - Ctrl+O (search)
///   - ⇧+Tab (reverse tab)
///   - ESC (escape)
///   - Ctrl+C (interrupt)
///
/// Web test groups (13 tests): rendering (4), button interactions (4),
/// disabled state (3), button titles (2).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/config/keyboard_constants.dart';
import 'package:tmux_control/widgets/terminal/tmux_keyboard.dart';

import '../helpers/widget_test_helpers.dart';

void main() {
  group('TmuxKeyboard (TmuxKeyboard.test.tsx port)', () {
    // ── rendering ──────────────────────────────────────────
    group('rendering', () {
      testWidgets('should render Ctrl+O button', (tester) async {
        // Port of: "should render Ctrl+O button"
        await tester.pumpWidget(buildTestWidget(
          const TmuxKeyboard(),
        ));
        await tester.pump();
        await tester.pump();

        expect(
          find.text(keyboardLabels[KeyboardCommands.ctrlO]!),
          findsOneWidget,
        );
      });

      testWidgets('should render ⇧+Tab button', (tester) async {
        // Port of: "should render ⇧+Tab button"
        await tester.pumpWidget(buildTestWidget(
          const TmuxKeyboard(),
        ));
        await tester.pump();
        await tester.pump();

        expect(
          find.text(keyboardLabels[KeyboardCommands.shiftTab]!),
          findsOneWidget,
        );
      });

      testWidgets('should render ESC button', (tester) async {
        // Port of: "should render ESC button"
        await tester.pumpWidget(buildTestWidget(
          const TmuxKeyboard(),
        ));
        await tester.pump();
        await tester.pump();

        expect(
          find.text(keyboardLabels[KeyboardCommands.escape]!),
          findsOneWidget,
        );
      });

      testWidgets('should render Ctrl+C button', (tester) async {
        // Port of: "should render Ctrl+C button"
        await tester.pumpWidget(buildTestWidget(
          const TmuxKeyboard(),
        ));
        await tester.pump();
        await tester.pump();

        expect(
          find.text(keyboardLabels[KeyboardCommands.ctrlC]!),
          findsOneWidget,
        );
      });

      testWidgets('should render all 4 keyboard buttons', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const TmuxKeyboard(),
        ));
        await tester.pump();
        await tester.pump();

        // Verify all 4 keyboard labels are present
        expect(
          find.text(keyboardLabels[KeyboardCommands.ctrlO]!),
          findsOneWidget,
        );
        expect(
          find.text(keyboardLabels[KeyboardCommands.shiftTab]!),
          findsOneWidget,
        );
        expect(
          find.text(keyboardLabels[KeyboardCommands.escape]!),
          findsOneWidget,
        );
        expect(
          find.text(keyboardLabels[KeyboardCommands.ctrlC]!),
          findsOneWidget,
        );
      });
    });

    // ── disabled state ────────────────────────────────────
    group('disabled state', () {
      testWidgets('should have enabled buttons when connected and not loading',
          (tester) async {
        // Port of: "should have enabled buttons when connected and not loading"
        await tester.pumpWidget(buildTestWidget(
          const TmuxKeyboard(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        // All 4 buttons should be enabled (onPressed != null)
        final buttons = tester.widgetList<OutlinedButton>(
          find.byType(OutlinedButton),
        );
        for (final button in buttons) {
          expect(button.onPressed, isNotNull,
              reason: 'Button should be enabled');
        }
      });

      testWidgets('should have disabled buttons when WS disconnected',
          (tester) async {
        // Port of: "should have disabled buttons when disconnected"
        await tester.pumpWidget(buildTestWidget(
          const TmuxKeyboard(),
          wsConnected: false,
        ));
        await tester.pump();
        await tester.pump();

        final buttons = tester.widgetList<OutlinedButton>(
          find.byType(OutlinedButton),
        );
        for (final button in buttons) {
          expect(button.onPressed, isNull,
              reason: 'Button should be disabled');
        }
      });
    });

    // ── button icons ──────────────────────────────────────
    group('button icons', () {
      testWidgets('should render correct icons for each button',
          (tester) async {
        // Port of: "should have correct button titles"
        await tester.pumpWidget(buildTestWidget(
          const TmuxKeyboard(),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.search), findsOneWidget);
        expect(find.byIcon(Icons.keyboard_tab), findsOneWidget);
        expect(find.byIcon(Icons.exit_to_app), findsOneWidget);
        expect(find.byIcon(Icons.clear_all), findsOneWidget);
      });
    });
  });
}
