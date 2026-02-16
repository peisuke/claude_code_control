/// Port of frontend/src/components/terminal/__tests__/CommandInputArea.test.tsx
///
/// Tests for CommandInputArea: text input field, send/enter/del/clear buttons,
/// expand/collapse, arrow keys, disabled state, loading state.
///
/// Web test cases (24) across 8 groups. Adapted for Flutter's widget testing.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/widgets/terminal/command_input_area.dart';

import '../helpers/widget_test_helpers.dart';

void main() {
  group('CommandInputArea (CommandInputArea.test.tsx port)', () {
    // ── rendering ──────────────────────────────────────────
    group('rendering', () {
      testWidgets('should render text input field', (tester) async {
        // Port of: "should render input field"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byType(TextField), findsOneWidget);
      });

      testWidgets('should render send button', (tester) async {
        // Port of: "should render send button"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('送信'), findsOneWidget);
      });

      testWidgets('should render Enter button', (tester) async {
        // Port of: "should render enter button"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Enter'), findsOneWidget);
      });

      testWidgets('should render Del button', (tester) async {
        // Port of: "should render del button"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Del'), findsOneWidget);
      });

      testWidgets('should render Clear button', (tester) async {
        // Port of: "should render clear button"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Clear'), findsOneWidget);
      });
    });

    // ── command input ────────────────────────────────────
    group('command input', () {
      testWidgets('should have hint text', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Enter message'), findsOneWidget);
      });

      testWidgets('should accept text input', (tester) async {
        // Port of: "should display command value"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        await tester.enterText(find.byType(TextField), 'echo hello');
        await tester.pump();

        expect(find.text('echo hello'), findsOneWidget);
      });
    });

    // ── disabled state ────────────────────────────────────
    group('disabled state', () {
      testWidgets('should disable buttons when WS disconnected',
          (tester) async {
        // Port of: "should disable send button when disconnected"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: false,
        ));
        await tester.pump();
        await tester.pump();

        // Check that buttons are disabled
        final filledButtons = tester.widgetList<FilledButton>(
          find.byType(FilledButton),
        );
        for (final button in filledButtons) {
          expect(button.onPressed, isNull,
              reason: 'FilledButton should be disabled');
        }

        // Note: expand/collapse button (fullscreen icon) stays enabled
        // because it's purely UI state, not dependent on WS connection.
        // Check command-related OutlinedButtons are disabled.
        final enterButton = tester.widget<OutlinedButton>(
          find.widgetWithText(OutlinedButton, 'Enter'),
        );
        expect(enterButton.onPressed, isNull);

        final delButton = tester.widget<OutlinedButton>(
          find.widgetWithText(OutlinedButton, 'Del'),
        );
        expect(delButton.onPressed, isNull);

        final clearButton = tester.widget<OutlinedButton>(
          find.widgetWithText(OutlinedButton, 'Clear'),
        );
        expect(clearButton.onPressed, isNull);
      });

      testWidgets('should disable TextField when WS disconnected',
          (tester) async {
        // Port of: "should disable input when disconnected"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: false,
        ));
        await tester.pump();
        await tester.pump();

        final textField =
            tester.widget<TextField>(find.byType(TextField));
        expect(textField.enabled, false);
      });

      testWidgets('should enable TextField when WS connected',
          (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        final textField =
            tester.widget<TextField>(find.byType(TextField));
        expect(textField.enabled, true);
      });
    });

    // ── expand/collapse ──────────────────────────────────
    group('expanded state', () {
      testWidgets('should toggle between expanded and collapsed',
          (tester) async {
        // Port of: "should render in collapsed mode" and "expanded mode"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        // Initially collapsed - should show fullscreen icon
        expect(find.byIcon(Icons.fullscreen), findsOneWidget);

        // Tap expand button
        await tester.tap(find.byIcon(Icons.fullscreen));
        await tester.pump();

        // Should now show fullscreen_exit icon
        expect(find.byIcon(Icons.fullscreen_exit), findsOneWidget);
      });
    });

    // ── arrow key buttons ──────────────────────────────────
    group('arrow key buttons', () {
      testWidgets('should render arrow up button', (tester) async {
        // Port of: "should render arrow up button"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.keyboard_arrow_up), findsOneWidget);
      });

      testWidgets('should render arrow down button', (tester) async {
        // Port of: "should render arrow down button"
        await tester.pumpWidget(buildTestWidget(
          const CommandInputArea(),
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.keyboard_arrow_down), findsOneWidget);
      });
    });
  });
}
