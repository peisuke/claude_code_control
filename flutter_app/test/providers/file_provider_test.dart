/// Port of frontend/src/hooks/__tests__/useFileContent.test.ts (12 test cases)
///
/// In Flutter, FileNotifier handles both file tree and file content.
/// Tests focus on the file content loading (matching useFileContent).
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
    SharedPreferences.setMockInitialValues({});
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
        // Directories sorted first by default
        expect(notifier.debugState.tree[0].name, 'dir');
        expect(notifier.debugState.tree[0].isDirectory, true);
        expect(notifier.debugState.tree[1].name, 'file.txt');
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

    // ── sort ─────────────────────────────────────────────────
    group('sort', () {
      test('should have default sort key=name, order=ascending', () {
        final notifier = FileNotifier(mockApi);

        expect(notifier.debugState.sortKey, FileSortKey.name);
        expect(notifier.debugState.sortOrder, FileSortOrder.ascending);
      });

      test('should sort by name ascending (default)', () async {
        mockApi.nextFileTree = ApiResponse<FileTreeResponse>(
          success: true,
          message: '',
          data: FileTreeResponse(
            tree: [
              FileNode(name: 'zebra.txt', path: '/zebra.txt', type: 'file'),
              FileNode(name: 'apple.txt', path: '/apple.txt', type: 'file'),
              FileNode(name: 'src', path: '/src', type: 'directory'),
              FileNode(name: 'docs', path: '/docs', type: 'directory'),
            ],
            currentPath: '/',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchTree();

        // Dirs first alphabetically, then files alphabetically
        expect(notifier.debugState.tree[0].name, 'docs');
        expect(notifier.debugState.tree[1].name, 'src');
        expect(notifier.debugState.tree[2].name, 'apple.txt');
        expect(notifier.debugState.tree[3].name, 'zebra.txt');
      });

      test('should sort by name descending', () async {
        mockApi.nextFileTree = ApiResponse<FileTreeResponse>(
          success: true,
          message: '',
          data: FileTreeResponse(
            tree: [
              FileNode(name: 'apple.txt', path: '/apple.txt', type: 'file'),
              FileNode(name: 'zebra.txt', path: '/zebra.txt', type: 'file'),
              FileNode(name: 'docs', path: '/docs', type: 'directory'),
              FileNode(name: 'src', path: '/src', type: 'directory'),
            ],
            currentPath: '/',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchTree();

        // Change sort to name descending
        await notifier.setSort(FileSortKey.name, FileSortOrder.descending);

        // Dirs first (Z-A), then files (Z-A)
        expect(notifier.debugState.tree[0].name, 'src');
        expect(notifier.debugState.tree[1].name, 'docs');
        expect(notifier.debugState.tree[2].name, 'zebra.txt');
        expect(notifier.debugState.tree[3].name, 'apple.txt');
      });

      test('should sort by modified ascending (oldest first)', () async {
        final older = DateTime(2024, 1, 1);
        final newer = DateTime(2024, 6, 15);

        mockApi.nextFileTree = ApiResponse<FileTreeResponse>(
          success: true,
          message: '',
          data: FileTreeResponse(
            tree: [
              FileNode(
                  name: 'new.txt',
                  path: '/new.txt',
                  type: 'file',
                  modified: newer),
              FileNode(
                  name: 'old.txt',
                  path: '/old.txt',
                  type: 'file',
                  modified: older),
              FileNode(
                  name: 'new_dir',
                  path: '/new_dir',
                  type: 'directory',
                  modified: newer),
              FileNode(
                  name: 'old_dir',
                  path: '/old_dir',
                  type: 'directory',
                  modified: older),
            ],
            currentPath: '/',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchTree();
        await notifier.setSort(FileSortKey.modified, FileSortOrder.ascending);

        // Dirs first (oldest first), then files (oldest first)
        expect(notifier.debugState.tree[0].name, 'old_dir');
        expect(notifier.debugState.tree[1].name, 'new_dir');
        expect(notifier.debugState.tree[2].name, 'old.txt');
        expect(notifier.debugState.tree[3].name, 'new.txt');
      });

      test('should sort by modified descending (newest first)', () async {
        final older = DateTime(2024, 1, 1);
        final newer = DateTime(2024, 6, 15);

        mockApi.nextFileTree = ApiResponse<FileTreeResponse>(
          success: true,
          message: '',
          data: FileTreeResponse(
            tree: [
              FileNode(
                  name: 'old.txt',
                  path: '/old.txt',
                  type: 'file',
                  modified: older),
              FileNode(
                  name: 'new.txt',
                  path: '/new.txt',
                  type: 'file',
                  modified: newer),
              FileNode(
                  name: 'old_dir',
                  path: '/old_dir',
                  type: 'directory',
                  modified: older),
              FileNode(
                  name: 'new_dir',
                  path: '/new_dir',
                  type: 'directory',
                  modified: newer),
            ],
            currentPath: '/',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchTree();
        await notifier.setSort(FileSortKey.modified, FileSortOrder.descending);

        // Dirs first (newest first), then files (newest first)
        expect(notifier.debugState.tree[0].name, 'new_dir');
        expect(notifier.debugState.tree[1].name, 'old_dir');
        expect(notifier.debugState.tree[2].name, 'new.txt');
        expect(notifier.debugState.tree[3].name, 'old.txt');
      });

      test('should handle null modified dates in sort', () async {
        final dt = DateTime(2024, 6, 15);

        mockApi.nextFileTree = ApiResponse<FileTreeResponse>(
          success: true,
          message: '',
          data: FileTreeResponse(
            tree: [
              FileNode(
                  name: 'dated.txt',
                  path: '/dated.txt',
                  type: 'file',
                  modified: dt),
              FileNode(
                  name: 'undated.txt',
                  path: '/undated.txt',
                  type: 'file'),
            ],
            currentPath: '/',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchTree();
        await notifier.setSort(FileSortKey.modified, FileSortOrder.ascending);

        // null modified treated as epoch(0), so comes first in ascending
        expect(notifier.debugState.tree[0].name, 'undated.txt');
        expect(notifier.debugState.tree[1].name, 'dated.txt');
      });

      test('should preserve sort when fetching new tree', () async {
        // First fetch
        mockApi.nextFileTree = ApiResponse<FileTreeResponse>(
          success: true,
          message: '',
          data: const FileTreeResponse(
            tree: [
              FileNode(name: 'a.txt', path: '/a.txt', type: 'file'),
              FileNode(name: 'b.txt', path: '/b.txt', type: 'file'),
            ],
            currentPath: '/',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchTree();
        await notifier.setSort(FileSortKey.name, FileSortOrder.descending);

        expect(notifier.debugState.tree[0].name, 'b.txt');
        expect(notifier.debugState.tree[1].name, 'a.txt');

        // Second fetch — sort order should be preserved
        mockApi.nextFileTree = ApiResponse<FileTreeResponse>(
          success: true,
          message: '',
          data: const FileTreeResponse(
            tree: [
              FileNode(name: 'x.txt', path: '/x.txt', type: 'file'),
              FileNode(name: 'y.txt', path: '/y.txt', type: 'file'),
            ],
            currentPath: '/sub',
          ),
        );

        await notifier.fetchTree(path: '/sub');

        expect(notifier.debugState.sortKey, FileSortKey.name);
        expect(notifier.debugState.sortOrder, FileSortOrder.descending);
        expect(notifier.debugState.tree[0].name, 'y.txt');
        expect(notifier.debugState.tree[1].name, 'x.txt');
      });

      test('should persist sort preference to SharedPreferences', () async {
        mockApi.nextFileTree = ApiResponse<FileTreeResponse>(
          success: true,
          message: '',
          data: const FileTreeResponse(
            tree: [
              FileNode(name: 'a.txt', path: '/a.txt', type: 'file'),
            ],
            currentPath: '/',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchTree();
        await notifier.setSort(FileSortKey.modified, FileSortOrder.descending);

        final prefs = await SharedPreferences.getInstance();
        expect(prefs.getString('file-sort-key'), 'modified');
        expect(prefs.getString('file-sort-order'), 'descending');
      });

      test('should load sort preference from SharedPreferences', () async {
        SharedPreferences.setMockInitialValues({
          'file-sort-key': 'modified',
          'file-sort-order': 'descending',
        });

        final notifier = FileNotifier(mockApi);
        // Let the async _loadSortPreference() complete
        await Future<void>.delayed(Duration.zero);

        expect(notifier.debugState.sortKey, FileSortKey.modified);
        expect(notifier.debugState.sortOrder, FileSortOrder.descending);
      });

      test('should preserve persisted sort preference after reset', () async {
        SharedPreferences.setMockInitialValues({
          'file-sort-key': 'modified',
          'file-sort-order': 'descending',
        });

        final notifier = FileNotifier(mockApi);
        await Future<void>.delayed(Duration.zero);

        expect(notifier.debugState.sortKey, FileSortKey.modified);
        expect(notifier.debugState.sortOrder, FileSortOrder.descending);

        // reset() should reload persisted preference, not revert to defaults
        notifier.reset();
        await Future<void>.delayed(Duration.zero);

        expect(notifier.debugState.sortKey, FileSortKey.modified);
        expect(notifier.debugState.sortOrder, FileSortOrder.descending);
      });

      test('should be case-insensitive when sorting by name', () async {
        mockApi.nextFileTree = ApiResponse<FileTreeResponse>(
          success: true,
          message: '',
          data: const FileTreeResponse(
            tree: [
              FileNode(name: 'Zebra.txt', path: '/Zebra.txt', type: 'file'),
              FileNode(name: 'apple.txt', path: '/apple.txt', type: 'file'),
              FileNode(name: 'Banana.txt', path: '/Banana.txt', type: 'file'),
            ],
            currentPath: '/',
          ),
        );

        final notifier = FileNotifier(mockApi);
        await notifier.fetchTree();

        expect(notifier.debugState.tree[0].name, 'apple.txt');
        expect(notifier.debugState.tree[1].name, 'Banana.txt');
        expect(notifier.debugState.tree[2].name, 'Zebra.txt');
      });
    });
  });
}
