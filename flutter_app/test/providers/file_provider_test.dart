/// Port of frontend/src/hooks/__tests__/useFileContent.test.ts (12 test cases)
///
/// In Flutter, FileNotifier handles both file tree and file content.
/// Tests focus on the file content loading (matching useFileContent).
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/models/api_response.dart';
import 'package:tmux_control/models/file_node.dart';
import 'package:tmux_control/providers/file_provider.dart';
import 'package:tmux_control/services/api_service.dart';

// ─── Mock ApiService ──────────────────────────────────────────────
class MockApiService extends ApiService {
  ApiResponse<FileContentResponse>? nextFileContent;
  Exception? nextFileContentError;

  ApiResponse<FileTreeResponse>? nextFileTree;
  Exception? nextFileTreeError;

  final List<String> getFileContentCalls = [];
  final List<String> getFileTreeCalls = [];

  MockApiService() : super(baseUrl: 'http://localhost:0/api');

  @override
  Future<ApiResponse<FileContentResponse>> getFileContent(String path) async {
    getFileContentCalls.add(path);
    if (nextFileContentError != null) {
      final err = nextFileContentError!;
      nextFileContentError = null;
      throw err;
    }
    final result = nextFileContent ??
        const ApiResponse<FileContentResponse>(
          success: false,
          message: 'Not configured',
        );
    nextFileContent = null;
    return result;
  }

  @override
  Future<ApiResponse<FileTreeResponse>> getFileTree({String path = '/'}) async {
    getFileTreeCalls.add(path);
    if (nextFileTreeError != null) {
      final err = nextFileTreeError!;
      nextFileTreeError = null;
      throw err;
    }
    final result = nextFileTree ??
        const ApiResponse<FileTreeResponse>(
          success: false,
          message: 'Not configured',
        );
    nextFileTree = null;
    return result;
  }
}

void main() {
  late MockApiService mockApi;

  setUp(() {
    mockApi = MockApiService();
  });

  group('FileNotifier (useFileContent port)', () {
    // ── initial state ──────────────────────────────────────────
    group('initial state', () {
      test('should have empty initial state', () {
        // Port of: "should have empty initial state"
        final notifier = FileNotifier(mockApi);

        expect(notifier.debugState.tree, isEmpty);
        expect(notifier.debugState.currentPath, '/');
        expect(notifier.debugState.selectedFile, isNull);
        expect(notifier.debugState.isLoadingTree, false);
        expect(notifier.debugState.isLoadingContent, false);
        expect(notifier.debugState.error, isNull);
      });
    });

    // ── fetchFileContent (handleFileOpen) ─────────────────────
    group('fetchFileContent (handleFileOpen)', () {
      test('should load file content successfully', () async {
        // Port of: "should load file content successfully"
        mockApi.nextFileContent = const ApiResponse<FileContentResponse>(
          success: true,
          message: '',
          data: FileContentResponse(
            content: 'file content here',
            path: '/path/to/file.txt',
            isImage: false,
            mimeType: 'text/plain',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchFileContent('/path/to/file.txt');

        expect(notifier.debugState.selectedFile, isNotNull);
        expect(notifier.debugState.selectedFile!.content, 'file content here');
        expect(notifier.debugState.selectedFile!.path, '/path/to/file.txt');
        expect(notifier.debugState.selectedFile!.isImage, false);
        expect(notifier.debugState.selectedFile!.mimeType, 'text/plain');
        expect(notifier.debugState.isLoadingContent, false);
        expect(notifier.debugState.error, isNull);
      });

      test('should handle image files', () async {
        // Port of: "should handle image files"
        mockApi.nextFileContent = const ApiResponse<FileContentResponse>(
          success: true,
          message: '',
          data: FileContentResponse(
            content: 'base64imagedata',
            path: '/path/to/image.png',
            isImage: true,
            mimeType: 'image/png',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchFileContent('/path/to/image.png');

        expect(notifier.debugState.selectedFile!.isImage, true);
        expect(notifier.debugState.selectedFile!.mimeType, 'image/png');
      });

      test('should set loading state during request', () async {
        // Port of: "should set loading state during request"
        mockApi.nextFileContent = const ApiResponse<FileContentResponse>(
          success: true,
          message: '',
          data: FileContentResponse(
            content: 'content',
            path: '/file.txt',
          ),
        );

        final notifier = FileNotifier(mockApi);

        final states = <bool>[];
        notifier.addListener((state) {
          states.add(state.isLoadingContent);
        });

        await notifier.fetchFileContent('/file.txt');

        // Should have set isLoadingContent true then false
        expect(states.contains(true), isTrue);
        expect(states.last, false);
      });

      test('should handle API error', () async {
        // Port of: "should handle API error"
        mockApi.nextFileContentError = Exception('Network error');

        final notifier = FileNotifier(mockApi);
        await notifier.fetchFileContent('/path/to/file.txt');

        expect(notifier.debugState.error, isNotNull);
        expect(notifier.debugState.selectedFile, isNull);
        expect(notifier.debugState.isLoadingContent, false);
      });

      test('should handle API response with success=false', () async {
        // Port of: "should handle API response with success=false"
        mockApi.nextFileContent = const ApiResponse<FileContentResponse>(
          success: false,
          message: 'File not found',
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchFileContent('/path/to/nonexistent.txt');

        expect(notifier.debugState.error, 'File not found');
        expect(notifier.debugState.selectedFile, isNull);
      });
    });

    // ── clearSelectedFile (handleFileDeselect) ────────────────
    group('clearSelectedFile (handleFileDeselect)', () {
      test('should clear selected file', () async {
        // Port of: "should clear all file state"
        mockApi.nextFileContent = const ApiResponse<FileContentResponse>(
          success: true,
          message: '',
          data: FileContentResponse(
            content: 'content',
            path: '/file.txt',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchFileContent('/file.txt');

        expect(notifier.debugState.selectedFile, isNotNull);

        notifier.clearSelectedFile();

        expect(notifier.debugState.selectedFile, isNull);
      });
    });

    // ── fetchTree ────────────────────────────────────────────
    group('fetchTree', () {
      test('should load file tree successfully', () async {
        mockApi.nextFileTree = const ApiResponse<FileTreeResponse>(
          success: true,
          message: '',
          data: FileTreeResponse(
            tree: [
              FileNode(name: 'file.txt', path: '/file.txt', type: 'file'),
              FileNode(name: 'dir', path: '/dir', type: 'directory'),
            ],
            currentPath: '/',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchTree();

        expect(notifier.debugState.tree.length, 2);
        expect(notifier.debugState.tree[0].name, 'file.txt');
        expect(notifier.debugState.tree[1].isDirectory, true);
        expect(notifier.debugState.currentPath, '/');
        expect(notifier.debugState.isLoadingTree, false);
      });

      test('should handle tree fetch error', () async {
        mockApi.nextFileTreeError = Exception('Network error');

        final notifier = FileNotifier(mockApi);
        await notifier.fetchTree();

        expect(notifier.debugState.error, isNotNull);
        expect(notifier.debugState.isLoadingTree, false);
      });
    });
  });
}
