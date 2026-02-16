/// Port of frontend/src/components/terminal/__tests__/ChoiceButtons.test.tsx
///
/// Tests for ChoiceButtons which auto-detects choices from terminal output
/// and renders numbered buttons (e.g., "1. Yes", "2. No").
///
/// Web test cases (3): button rendering, click handler, disabled state.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/widgets/terminal/choice_buttons.dart';

import '../helpers/widget_test_helpers.dart';

void main() {
  group('ChoiceButtons (ChoiceButtons.test.tsx port)', () {
    // ── rendering ──────────────────────────────────────────
    group('rendering', () {
      testWidgets('should render choice buttons from output content',
          (tester) async {
        // Port of: "should render buttons with number prefixes"
        // Provide output content that contains detectable choices.
        // ChoiceDetector expects "NUMBER. TEXT" format with Yes/No.
        await tester.pumpWidget(buildTestWidget(
          const ChoiceButtons(),
          outputContent: 'Choose:\n1. Yes\n2. No\n',
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('1. Yes'), findsOneWidget);
        expect(find.text('2. No'), findsOneWidget);
      });

      testWidgets('should render nothing when no choices detected',
          (tester) async {
        // When output doesn't contain choices, should render empty.
        await tester.pumpWidget(buildTestWidget(
          const ChoiceButtons(),
          outputContent: 'Just regular output\nNo choices here\n\$ ',
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byType(OutlinedButton), findsNothing);
      });

      testWidgets('should render as OutlinedButton widgets',
          (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const ChoiceButtons(),
          outputContent: 'Choose:\n1. Yes\n2. No\n',
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        // Two choice buttons should be rendered as OutlinedButton
        expect(find.byType(OutlinedButton), findsNWidgets(2));
      });
    });

    // ── disabled state ────────────────────────────────────
    group('disabled state', () {
      testWidgets('should disable buttons when WS disconnected',
          (tester) async {
        // Port of: "should disable all buttons when disabled prop is true"
        await tester.pumpWidget(buildTestWidget(
          const ChoiceButtons(),
          outputContent: 'Choose:\n1. Yes\n2. No\n',
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

      testWidgets('should enable buttons when WS connected', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const ChoiceButtons(),
          outputContent: 'Choose:\n1. Yes\n2. No\n',
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        final buttons = tester.widgetList<OutlinedButton>(
          find.byType(OutlinedButton),
        );
        for (final button in buttons) {
          expect(button.onPressed, isNotNull,
              reason: 'Button should be enabled');
        }
      });
    });
  });
}
