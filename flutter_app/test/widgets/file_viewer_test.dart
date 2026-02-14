/// Port of frontend/src/components/file/__tests__/FileOperations.test.tsx
///
/// Tests for FileViewer which displays text/image file content.
/// Web test cases (32): rendering (3), loading (2), error (3), close (2),
/// image (2), language detection (8), empty file (1), no file (1),
/// file extensions (11).
///
/// Flutter adaptation:
///   - FileViewer is a ConsumerWidget reading fileProvider.
///   - Text displayed with line numbers via ListView.builder.
///   - Image displayed with Image.memory from base64.
///   - Close button calls clearSelectedFile().
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/models/file_node.dart';
import 'package:tmux_control/providers/connection_provider.dart';
import 'package:tmux_control/providers/file_provider.dart';
import 'package:tmux_control/providers/websocket_provider.dart';
import 'package:tmux_control/services/websocket_service.dart';
import 'package:tmux_control/widgets/file/file_viewer.dart';

import '../helpers/widget_test_helpers.dart';

/// Build a widget tree with FileViewer and mocked file state.
/// Uses direct provider override since FileViewer needs specific selectedFile state
/// that can't be set through NoOpApiService's constructor.
Widget _build({
  FileContentResponse? selectedFile,
  bool isLoadingContent = false,
}) {
  return ProviderScope(
    overrides: [
      apiServiceProvider.overrideWithValue(NoOpApiService()),
      connectionProvider.overrideWith((ref) {
        return ConnectionNotifier(NoOpApiService());
      }),
      wsConnectionStateProvider.overrideWith((ref) {
        return Stream.value(WsConnectionState.connected);
      }),
      fileProvider.overrideWith((ref) {
        final notifier = FileNotifier(NoOpApiService());
        // Set initial state synchronously before the notifier is used.
        // FileNotifier constructor doesn't call any async methods, so this is safe.
        // ignore: invalid_use_of_protected_member
        notifier.state = FileState(
          selectedFile: selectedFile,
          isLoadingContent: isLoadingContent,
        );
        return notifier;
      }),
    ],
    child: MaterialApp(
      home: Scaffold(
        body: SizedBox(
          width: 400,
          height: 600,
          child: const FileViewer(),
        ),
      ),
    ),
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('FileViewer (FileOperations.test.tsx port)', () {
    // ── no file selected ──────────────────────────────────
    group('no file selected', () {
      testWidgets('should show placeholder when no file selected',
          (tester) async {
        // Port of: "should display placeholder" / "no file selected"
        await tester.pumpWidget(_build());
        await tester.pump();
        await tester.pump();

        expect(find.text('Select a file to view'), findsOneWidget);
      });
    });

    // ── loading state ──────────────────────────────────────
    group('loading state', () {
      testWidgets('should show loading indicator when loading content',
          (tester) async {
        // Port of: "should show loading indicator"
        await tester.pumpWidget(_build(isLoadingContent: true));
        await tester.pump();
        await tester.pump();

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('should not show file content when loading',
          (tester) async {
        // Port of: "should not display content while loading"
        await tester.pumpWidget(_build(isLoadingContent: true));
        await tester.pump();
        await tester.pump();

        expect(find.text('Select a file to view'), findsNothing);
      });
    });

    // ── rendering ──────────────────────────────────────────
    group('rendering', () {
      testWidgets('should display file path in header', (tester) async {
        // Port of: "should display file name"
        await tester.pumpWidget(_build(
          selectedFile: const FileContentResponse(
            content: 'hello world',
            path: '/home/user/test.txt',
          ),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('/home/user/test.txt'), findsOneWidget);
      });

      testWidgets('should display close button', (tester) async {
        // Port of: "should display close button"
        await tester.pumpWidget(_build(
          selectedFile: const FileContentResponse(
            content: 'content',
            path: '/test.txt',
          ),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.close), findsOneWidget);
      });

      testWidgets('should display file content', (tester) async {
        // Port of: "should display file content"
        await tester.pumpWidget(_build(
          selectedFile: const FileContentResponse(
            content: 'line one\nline two\nline three',
            path: '/test.txt',
          ),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('line one'), findsOneWidget);
        expect(find.text('line two'), findsOneWidget);
        expect(find.text('line three'), findsOneWidget);
      });
    });

    // ── line numbers ──────────────────────────────────────
    group('line numbers', () {
      testWidgets('should show line numbers', (tester) async {
        await tester.pumpWidget(_build(
          selectedFile: const FileContentResponse(
            content: 'first\nsecond\nthird',
            path: '/test.txt',
          ),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('1'), findsOneWidget);
        expect(find.text('2'), findsOneWidget);
        expect(find.text('3'), findsOneWidget);
      });
    });

    // ── empty file ──────────────────────────────────────────
    group('empty file', () {
      testWidgets('should handle empty file content', (tester) async {
        // Port of: "should show empty file placeholder"
        await tester.pumpWidget(_build(
          selectedFile: const FileContentResponse(
            content: '',
            path: '/empty.txt',
          ),
        ));
        await tester.pump();
        await tester.pump();

        // Should still render (with empty line), not crash
        expect(find.text('/empty.txt'), findsOneWidget);
      });
    });

    // ── multiline content ──────────────────────────────────
    group('multiline content', () {
      testWidgets('should render multiple lines with ListView',
          (tester) async {
        await tester.pumpWidget(_build(
          selectedFile: const FileContentResponse(
            content: 'def hello():\n  print("hi")\n\nhello()',
            path: '/script.py',
          ),
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('def hello():'), findsOneWidget);
        expect(find.text('  print("hi")'), findsOneWidget);
        expect(find.text('hello()'), findsOneWidget);
      });
    });

    // ── image display ──────────────────────────────────────
    group('image display', () {
      testWidgets('should show image viewer for image files', (tester) async {
        // Port of: "should render image for image files"
        // Minimal valid 1x1 PNG in base64
        const base64Png =
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        await tester.pumpWidget(_build(
          selectedFile: const FileContentResponse(
            content: base64Png,
            path: '/photo.png',
            isImage: true,
          ),
        ));
        await tester.pump();
        await tester.pump();

        // Should render an InteractiveViewer for image
        expect(find.byType(InteractiveViewer), findsOneWidget);
      });

      testWidgets('should not show line numbers for image files',
          (tester) async {
        // Port of: "should not use syntax highlighter for images"
        const base64Png =
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        await tester.pumpWidget(_build(
          selectedFile: const FileContentResponse(
            content: base64Png,
            path: '/photo.png',
            isImage: true,
          ),
        ));
        await tester.pump();
        await tester.pump();

        // Line numbers should not appear for images
        expect(find.text('1'), findsNothing);
      });
    });
  });
}
