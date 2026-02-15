/// Port of frontend/src/components/file/__tests__/FileExplorer.test.tsx
///
/// Tests for FileExplorer which displays directory listing with breadcrumb nav.
/// Web test cases (28): rendering (3), file tree loading (4), file selection (3),
/// directory navigation (4), refresh (1), error (2), session storage (2), disabled (1).
///
/// Flutter adaptation:
///   - Uses Riverpod fileProvider fed by NoOpApiService.
///   - Breadcrumbs built from currentPath.
///   - File/directory items use ListTile.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/models/file_node.dart';
import 'package:tmux_control/widgets/file/file_explorer.dart';

import '../helpers/widget_test_helpers.dart';

/// Build a widget for FileExplorer testing.
Widget _build({
  List<FileNode> tree = const [],
  String currentPath = '/',
}) {
  return buildTestWidget(
    SizedBox(
      width: 300,
      height: 600,
      child: const FileExplorer(),
    ),
    fileTree: tree,
    fileTreePath: currentPath,
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('FileExplorer (FileExplorer.test.tsx port)', () {
    // ── rendering ──────────────────────────────────────────
    group('rendering', () {
      testWidgets('should render root breadcrumb', (tester) async {
        // Port of: "should render title" / "should render root button"
        await tester.pumpWidget(_build());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // The "/" breadcrumb should always be present
        expect(find.text('/'), findsOneWidget);
      });

      testWidgets('should show empty directory message when tree is empty',
          (tester) async {
        await tester.pumpWidget(_build(tree: []));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('Empty directory'), findsOneWidget);
      });
    });

    // ── file tree display ──────────────────────────────────
    group('file tree display', () {
      final testTree = const [
        FileNode(name: 'src', path: '/src', type: 'directory'),
        FileNode(name: 'README.md', path: '/README.md', type: 'file'),
        FileNode(name: 'main.py', path: '/main.py', type: 'file'),
      ];

      testWidgets('should render file and directory names', (tester) async {
        // Port of: "should display file names"
        await tester.pumpWidget(_build(tree: testTree));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('src'), findsOneWidget);
        expect(find.text('README.md'), findsOneWidget);
        expect(find.text('main.py'), findsOneWidget);
      });

      testWidgets('should show folder icon for directories', (tester) async {
        await tester.pumpWidget(_build(tree: testTree));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.folder), findsOneWidget);
      });

      testWidgets('should show file icon for files', (tester) async {
        await tester.pumpWidget(_build(tree: const [
          FileNode(name: 'data.json', path: '/data.json', type: 'file'),
        ]));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // data.json should get data_object icon
        expect(find.byIcon(Icons.data_object), findsOneWidget);
      });

      testWidgets('should show code icon for source files', (tester) async {
        await tester.pumpWidget(_build(tree: const [
          FileNode(name: 'app.dart', path: '/app.dart', type: 'file'),
        ]));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.code), findsOneWidget);
      });

      testWidgets('should show image icon for image files', (tester) async {
        await tester.pumpWidget(_build(tree: const [
          FileNode(name: 'photo.png', path: '/photo.png', type: 'file'),
        ]));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.image), findsOneWidget);
      });

      testWidgets('should show description icon for text files',
          (tester) async {
        await tester.pumpWidget(_build(tree: const [
          FileNode(name: 'notes.md', path: '/notes.md', type: 'file'),
        ]));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.description), findsOneWidget);
      });
    });

    // ── breadcrumb navigation ──────────────────────────────
    group('breadcrumb navigation', () {
      testWidgets('should show breadcrumb parts for nested path',
          (tester) async {
        // Port of: "should navigate to parent directory"
        await tester.pumpWidget(
            _build(currentPath: '/home/user/projects'));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('/'), findsOneWidget);
        expect(find.text('home'), findsOneWidget);
        expect(find.text('user'), findsOneWidget);
        expect(find.text('projects'), findsOneWidget);
      });

      testWidgets('should show only root for root path', (tester) async {
        await tester.pumpWidget(_build(currentPath: '/'));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('/'), findsOneWidget);
      });
    });

    // ── parent directory ──────────────────────────────────
    group('parent directory', () {
      testWidgets('should show parent ".." entry when not at root',
          (tester) async {
        // Port of: "should navigate to parent directory"
        await tester.pumpWidget(_build(
          currentPath: '/home/user',
          tree: const [
            FileNode(
                name: 'file.txt', path: '/home/user/file.txt', type: 'file'),
          ],
        ));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('..'), findsOneWidget);
      });

      testWidgets('should not show parent ".." entry at root',
          (tester) async {
        await tester.pumpWidget(_build(
          currentPath: '/',
          tree: const [
            FileNode(name: 'file.txt', path: '/file.txt', type: 'file'),
          ],
        ));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('..'), findsNothing);
      });
    });

    // ── ListTile rendering ──────────────────────────────────
    group('list tile rendering', () {
      testWidgets('should render items as ListTile widgets', (tester) async {
        await tester.pumpWidget(_build(tree: const [
          FileNode(name: 'test.txt', path: '/test.txt', type: 'file'),
        ]));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byType(ListTile), findsWidgets);
      });
    });
  });
}
