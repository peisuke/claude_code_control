/// Port of frontend/src/components/terminal/__tests__/TerminalOutput.test.tsx
///
/// Tests for TerminalOutput widget: rendering, loading state, styling, special characters.
/// Web tests: rendering (4), loading state (3), scroll handling (2), outputRef (2),
///            styling (1), special characters (2).
///
/// Flutter adaptation:
///   - TerminalOutput is a ConsumerStatefulWidget with ScrollController + LayoutBuilder.
///   - Uses ListView.builder + AnsiParser.parseLine for ANSI rendering.
///   - Scroll/ref tests adapted to Flutter's scroll system.
///   - Web-specific tests (DOM ref, dangerouslySetInnerHTML) omitted.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/config/theme.dart';
import 'package:tmux_control/widgets/terminal/terminal_output.dart';

import '../helpers/widget_test_helpers.dart';

Widget _build({String content = ''}) {
  return buildTestWidget(
    SizedBox(
      width: 400,
      height: 600,
      child: const TerminalOutput(),
    ),
    outputContent: content,
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('TerminalOutput (TerminalOutput.test.tsx port)', () {
    // ── rendering ──────────────────────────────────────────
    group('rendering', () {
      testWidgets('should render without crashing', (tester) async {
        // Port of: basic render test
        await tester.pumpWidget(_build(content: 'test'));
        await tester.pump();
        await tester.pump();

        expect(find.byType(TerminalOutput), findsOneWidget);
      });

      testWidgets('should render output content', (tester) async {
        // Port of: "should render output content"
        await tester.pumpWidget(_build(content: 'Hello World'));
        await tester.pump();
        await tester.pump();

        expect(find.textContaining('Hello World'), findsOneWidget);
      });

      testWidgets('should render multiline output', (tester) async {
        // Port of: "should render multiline output"
        await tester.pumpWidget(_build(content: 'Line 1\nLine 2\nLine 3'));
        await tester.pump();
        await tester.pump();

        expect(find.textContaining('Line 1'), findsOneWidget);
        expect(find.textContaining('Line 2'), findsOneWidget);
        expect(find.textContaining('Line 3'), findsOneWidget);
      });

      testWidgets('should convert ANSI codes to styled text', (tester) async {
        // Port of: "should convert ANSI codes to HTML"
        // In Flutter, ANSI → TextSpan via AnsiParser
        await tester.pumpWidget(
            _build(content: '\x1b[31mRed Text\x1b[0m'));
        await tester.pump();
        await tester.pump();

        // ANSI codes stripped, text content preserved
        expect(find.textContaining('Red Text'), findsOneWidget);
      });

      testWidgets('should render empty terminal', (tester) async {
        // Port of: "should render placeholder when output is empty"
        // Flutter renders a single space for empty content
        await tester.pumpWidget(_build(content: ''));
        await tester.pump();
        await tester.pump();

        expect(find.byType(TerminalOutput), findsOneWidget);
      });
    });

    // ── loading state ──────────────────────────────────────
    group('loading state', () {
      testWidgets('should not show loading indicator by default',
          (tester) async {
        // Port of: "should not show loading indicator by default"
        await tester.pumpWidget(_build(content: 'test'));
        await tester.pump();
        await tester.pump();

        expect(find.byType(CircularProgressIndicator), findsNothing);
      });
    });

    // ── styling ──────────────────────────────────────────────
    group('styling', () {
      testWidgets('should have terminal-like black background',
          (tester) async {
        // Port of: "should have terminal-like styling"
        await tester.pumpWidget(_build(content: 'test'));
        await tester.pump();
        await tester.pump();

        // Find Container with terminal background color
        final containers = tester
            .widgetList<Container>(find.byType(Container))
            .where((c) => c.decoration is BoxDecoration)
            .where((c) {
          final decoration = c.decoration as BoxDecoration;
          return decoration.color == AppTheme.terminalBackground;
        });
        expect(containers.isNotEmpty, isTrue);
      });
    });

    // ── scroll ────────────────────────────────────────────────
    group('scroll', () {
      testWidgets('should use ListView.builder for rendering',
          (tester) async {
        await tester.pumpWidget(_build(content: 'test'));
        await tester.pump();
        await tester.pump();

        expect(find.byType(ListView), findsOneWidget);
      });

      testWidgets('should show refresh FAB by default (at bottom)',
          (tester) async {
        // FAB is always visible: refresh icon at bottom, arrow_downward when scrolled up
        await tester.pumpWidget(_build(content: 'test'));
        await tester.pump();
        await tester.pump();

        expect(find.byType(FloatingActionButton), findsOneWidget);
        expect(find.byIcon(Icons.refresh), findsOneWidget);
        expect(find.byIcon(Icons.arrow_downward), findsNothing);
      });
    });

    // ── special characters ────────────────────────────────────
    group('special characters', () {
      testWidgets('should handle special characters in output',
          (tester) async {
        // Port of: "should handle special characters in output"
        final output = '\$ echo "hello" && pwd\n/home/user';
        await tester.pumpWidget(_build(content: output));
        await tester.pump();
        await tester.pump();

        expect(find.textContaining('echo'), findsOneWidget);
      });

      testWidgets('should handle empty lines', (tester) async {
        // Port of: "should handle empty lines"
        await tester.pumpWidget(_build(content: 'Line 1\n\nLine 3'));
        await tester.pump();
        await tester.pump();

        expect(find.textContaining('Line 1'), findsOneWidget);
        expect(find.textContaining('Line 3'), findsOneWidget);
      });
    });
  });
}
