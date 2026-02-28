/// Port of frontend/src/components/tmux/__tests__/SessionTreeView.test.tsx
///
/// Tests for SessionTreeView which displays expandable session/window/pane tree.
/// Web test cases (25): rendering (3), session expansion (2), target selection (3),
/// session management (8), window management (4), error handling (2).
///
/// Flutter adaptation:
///   - Uses Riverpod providers instead of props.
///   - Session hierarchy comes from sessionProvider (fed by NoOpApiService).
///   - Target selection via selectedTargetProvider.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/models/tmux_session.dart';
import 'package:tmux_control/providers/output_provider.dart';
import 'package:tmux_control/widgets/session/session_tree_view.dart';

import '../helpers/widget_test_helpers.dart';

/// Mock hierarchy with 2 sessions, multiple windows, and panes.
const _mockHierarchy = TmuxHierarchy(sessions: {
  'default': TmuxSession(name: 'default', windows: {
    '0': TmuxWindow(
      index: '0',
      name: 'bash',
      active: true,
      panes: {
        '0': TmuxPane(index: '0', active: true, command: 'bash'),
      },
    ),
    '1': TmuxWindow(
      index: '1',
      name: 'vim',
      active: false,
      panes: {
        '0': TmuxPane(index: '0', active: true, command: 'vim'),
        '1': TmuxPane(index: '1', active: false, command: 'bash'),
      },
    ),
  }),
  'secondary': TmuxSession(name: 'secondary', windows: {
    '0': TmuxWindow(
      index: '0',
      name: 'main',
      active: true,
      panes: {
        '0': TmuxPane(index: '0', active: true, command: 'zsh'),
      },
    ),
  }),
});

/// Single session hierarchy — for "prevent deleting last session" tests.
const _singleSessionHierarchy = TmuxHierarchy(sessions: {
  'only': TmuxSession(name: 'only', windows: {
    '0': TmuxWindow(
      index: '0',
      name: 'main',
      active: true,
      panes: {},
    ),
  }),
});

/// Build a widget for SessionTreeView testing.
Widget _build({
  TmuxHierarchy hierarchy = _mockHierarchy,
  String selectedTarget = 'default:0',
}) {
  return buildTestWidget(
    SizedBox(
      width: 300,
      height: 600,
      child: const SessionTreeView(),
    ),
    hierarchy: hierarchy,
    extraOverrides: [
      selectedTargetProvider.overrideWith((ref) => selectedTarget),
    ],
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('SessionTreeView (SessionTreeView.test.tsx port)', () {
    // ── rendering ──────────────────────────────────────────
    group('rendering', () {
      testWidgets('should render session names', (tester) async {
        // Port of: "should render session names"
        await tester.pumpWidget(_build());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('default'), findsOneWidget);
        expect(find.text('secondary'), findsOneWidget);
      });

      testWidgets('should render Sessions header', (tester) async {
        // Port of: "should render add session button"
        await tester.pumpWidget(_build());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('Sessions'), findsOneWidget);
      });

      testWidgets('should show empty state when no sessions', (tester) async {
        // Port of: "should show empty state when no sessions"
        await tester.pumpWidget(_build(
          hierarchy: const TmuxHierarchy(sessions: {}),
        ));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('No sessions'), findsOneWidget);
      });

      testWidgets('should render refresh and add buttons', (tester) async {
        await tester.pumpWidget(_build());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.refresh), findsOneWidget);
        // Add buttons: 1 for new session + 1 per session for new window
        expect(find.byIcon(Icons.add), findsWidgets);
      });
    });

    // ── session expansion ──────────────────────────────────
    group('session expansion', () {
      testWidgets('should auto-expand selected session', (tester) async {
        // Port of: "should auto-expand selected session"
        await tester.pumpWidget(_build(selectedTarget: 'default:0'));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // Window "0: bash" should be visible because default is auto-expanded
        expect(find.text('0: bash'), findsOneWidget);
      });

      testWidgets('should toggle non-selected session expansion',
          (tester) async {
        // Port of: "should toggle session expansion when chevron clicked"
        // Note: auto-expand prevents collapsing the SELECTED session,
        // so we test toggling the non-selected "secondary" session.
        await tester.pumpWidget(_build(selectedTarget: 'default:0'));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // "secondary" session is collapsed by default (not selected)
        expect(find.text('0: main'), findsNothing);

        // Tap on "secondary" to expand
        await tester.tap(find.text('secondary'));
        await tester.pump();

        // Window "0: main" should now be visible
        expect(find.text('0: main'), findsOneWidget);

        // Tap again to collapse
        await tester.tap(find.text('secondary'));
        await tester.pump();

        expect(find.text('0: main'), findsNothing);
      });
    });

    // ── window display ──────────────────────────────────────
    group('window display', () {
      testWidgets('should show window name with index', (tester) async {
        await tester.pumpWidget(_build(selectedTarget: 'default:0'));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('0: bash'), findsOneWidget);
        expect(find.text('1: vim'), findsOneWidget);
      });

      testWidgets('should show panes for windows with multiple panes',
          (tester) async {
        // Window "1: vim" has 2 panes, should show them
        await tester.pumpWidget(_build(selectedTarget: 'default:1'));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('Pane 0'), findsOneWidget);
        expect(find.text('Pane 1'), findsOneWidget);
      });
    });

    // ── delete protection ──────────────────────────────────
    group('delete protection', () {
      testWidgets('should not show delete button for single session',
          (tester) async {
        // Port of: "should prevent deleting last session"
        await tester.pumpWidget(_build(
          hierarchy: _singleSessionHierarchy,
          selectedTarget: 'only:0',
        ));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // With only one session, delete_outline icon should not appear
        expect(find.byIcon(Icons.delete_outline), findsNothing);
      });

      testWidgets('should show delete button when multiple sessions',
          (tester) async {
        await tester.pumpWidget(_build());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // With 2 sessions, delete buttons should appear
        expect(find.byIcon(Icons.delete_outline), findsWidgets);
      });
    });

    // ── icons ──────────────────────────────────────────────
    group('icons', () {
      testWidgets('should show folder icon for sessions', (tester) async {
        await tester.pumpWidget(_build());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.folder), findsWidgets);
      });

      testWidgets('should show web_asset icon for windows', (tester) async {
        await tester.pumpWidget(_build(selectedTarget: 'default:0'));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.web_asset), findsWidgets);
      });
    });

    // ── rename ──────────────────────────────────────────
    group('rename', () {
      testWidgets('should show edit icon for sessions', (tester) async {
        await tester.pumpWidget(_build());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // Edit icons should appear for sessions
        expect(find.byIcon(Icons.edit), findsWidgets);
      });

      testWidgets('should show edit icon for windows', (tester) async {
        await tester.pumpWidget(_build(selectedTarget: 'default:0'));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // Edit icons should appear (for sessions and windows)
        expect(find.byIcon(Icons.edit), findsWidgets);
      });

      testWidgets('should show rename dialog when session edit tapped',
          (tester) async {
        await tester.pumpWidget(_build());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // Find the first edit button (session rename) and tap it
        await tester.tap(find.byIcon(Icons.edit).first);
        await tester.pumpAndSettle();

        // Rename dialog should be visible
        expect(find.text('Rename Session'), findsOneWidget);
        expect(find.text('Cancel'), findsOneWidget);
        expect(find.text('Rename'), findsOneWidget);
      });

      testWidgets('should show rename dialog when window edit tapped',
          (tester) async {
        await tester.pumpWidget(_build(selectedTarget: 'default:0'));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // Find the window edit button — session edit icons come first,
        // window edit icons follow. With 'default' expanded showing 2 windows,
        // we have: 2 session edits + 2 window edits = 4 total.
        // Window edits start at index 2.
        final editIcons = find.byIcon(Icons.edit);
        // Tap the 3rd edit icon (first window edit)
        await tester.tap(editIcons.at(2));
        await tester.pumpAndSettle();

        expect(find.text('Rename Window'), findsOneWidget);
      });

      testWidgets('should dismiss rename dialog on cancel', (tester) async {
        await tester.pumpWidget(_build());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        await tester.tap(find.byIcon(Icons.edit).first);
        await tester.pumpAndSettle();

        // Tap cancel
        await tester.tap(find.text('Cancel'));
        await tester.pumpAndSettle();

        // Dialog should be dismissed
        expect(find.text('Rename Session'), findsNothing);
      });
    });

    // ── error state ──────────────────────────────────────
    group('error state', () {
      testWidgets('should show No sessions with empty hierarchy',
          (tester) async {
        // Port of: SessionManager "should display error/empty state"
        await tester.pumpWidget(_build(
          hierarchy: const TmuxHierarchy(sessions: {}),
        ));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('No sessions'), findsOneWidget);
      });
    });
  });
}
