import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/file_node.dart';
import '../services/api_service.dart';
import 'connection_provider.dart';

class FileState {
  final List<FileNode> tree;
  final String currentPath;
  final FileContentResponse? selectedFile;
  final bool isLoadingTree;
  final bool isLoadingContent;
  final String? error;

  const FileState({
    this.tree = const [],
    this.currentPath = '/',
    this.selectedFile,
    this.isLoadingTree = false,
    this.isLoadingContent = false,
    this.error,
  });

  FileState copyWith({
    List<FileNode>? tree,
    String? currentPath,
    FileContentResponse? selectedFile,
    bool? isLoadingTree,
    bool? isLoadingContent,
    String? error,
    bool clearSelectedFile = false,
  }) {
    return FileState(
      tree: tree ?? this.tree,
      currentPath: currentPath ?? this.currentPath,
      selectedFile:
          clearSelectedFile ? null : (selectedFile ?? this.selectedFile),
      isLoadingTree: isLoadingTree ?? this.isLoadingTree,
      isLoadingContent: isLoadingContent ?? this.isLoadingContent,
      error: error,
    );
  }
}

final fileProvider =
    StateNotifierProvider<FileNotifier, FileState>((ref) {
  final api = ref.watch(apiServiceProvider);
  return FileNotifier(api);
});

class FileNotifier extends StateNotifier<FileState> {
  final ApiService _api;

  FileNotifier(this._api) : super(const FileState());

  Future<void> fetchTree({String path = '/'}) async {
    state = state.copyWith(isLoadingTree: true, error: null);
    try {
      final response = await _api.getFileTree(path: path);
      if (response.success && response.data != null) {
        state = state.copyWith(
          tree: response.data!.tree,
          currentPath: response.data!.currentPath,
          isLoadingTree: false,
        );
      } else {
        state = state.copyWith(
            isLoadingTree: false, error: response.message);
      }
    } catch (e) {
      state = state.copyWith(isLoadingTree: false, error: e.toString());
    }
  }

  Future<void> fetchFileContent(String path) async {
    state = state.copyWith(isLoadingContent: true, error: null);
    try {
      final response = await _api.getFileContent(path);
      if (response.success && response.data != null) {
        state = state.copyWith(
          selectedFile: response.data,
          isLoadingContent: false,
        );
      } else {
        state = state.copyWith(
            isLoadingContent: false, error: response.message);
      }
    } catch (e) {
      state = state.copyWith(isLoadingContent: false, error: e.toString());
    }
  }

  void clearSelectedFile() {
    state = state.copyWith(clearSelectedFile: true);
  }

  void navigateTo(String path) {
    fetchTree(path: path);
  }
}
