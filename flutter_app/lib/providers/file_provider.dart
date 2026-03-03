import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../models/file_node.dart';
import '../services/api_service.dart';
import 'connection_provider.dart';

enum FileSortKey { name, modified }

enum FileSortOrder { ascending, descending }

class FileState {
  final List<FileNode> tree;
  final String currentPath;
  final FileContentResponse? selectedFile;
  final bool isLoadingTree;
  final bool isLoadingContent;
  final String? error;
  final FileSortKey sortKey;
  final FileSortOrder sortOrder;

  const FileState({
    this.tree = const [],
    this.currentPath = '/',
    this.selectedFile,
    this.isLoadingTree = false,
    this.isLoadingContent = false,
    this.error,
    this.sortKey = FileSortKey.name,
    this.sortOrder = FileSortOrder.ascending,
  });

  FileState copyWith({
    List<FileNode>? tree,
    String? currentPath,
    FileContentResponse? selectedFile,
    bool? isLoadingTree,
    bool? isLoadingContent,
    String? error,
    bool clearSelectedFile = false,
    FileSortKey? sortKey,
    FileSortOrder? sortOrder,
  }) {
    return FileState(
      tree: tree ?? this.tree,
      currentPath: currentPath ?? this.currentPath,
      selectedFile:
          clearSelectedFile ? null : (selectedFile ?? this.selectedFile),
      isLoadingTree: isLoadingTree ?? this.isLoadingTree,
      isLoadingContent: isLoadingContent ?? this.isLoadingContent,
      error: error,
      sortKey: sortKey ?? this.sortKey,
      sortOrder: sortOrder ?? this.sortOrder,
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

  FileNotifier(this._api) : super(const FileState()) {
    _loadSortPreference();
  }

  Future<void> _loadSortPreference() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    final keyStr = prefs.getString(AppConfig.keyFileSortKey);
    final orderStr = prefs.getString(AppConfig.keyFileSortOrder);
    // Only apply if there is a saved preference; skip if prefs are empty
    // to avoid overwriting a setSort() call that raced ahead.
    if (keyStr == null && orderStr == null) return;
    final key = keyStr == 'modified' ? FileSortKey.modified : FileSortKey.name;
    final order = orderStr == 'descending'
        ? FileSortOrder.descending
        : FileSortOrder.ascending;
    if (key != state.sortKey || order != state.sortOrder) {
      state = state.copyWith(
        sortKey: key,
        sortOrder: order,
        tree: _sortTree(state.tree, key, order),
      );
    }
  }

  /// Clear file state (e.g. on server switch) so stale data is not shown.
  /// Re-loads persisted sort preference so it survives resets.
  void reset() {
    state = const FileState();
    _loadSortPreference();
  }

  Future<void> fetchTree({String path = '/'}) async {
    state = state.copyWith(isLoadingTree: true, error: null);
    try {
      final response = await _api.getFileTree(path: path);
      if (!mounted) return;
      if (response.success && response.data != null) {
        state = state.copyWith(
          tree: _sortTree(response.data!.tree, state.sortKey, state.sortOrder),
          currentPath: response.data!.currentPath,
          isLoadingTree: false,
        );
      } else {
        state = state.copyWith(
            isLoadingTree: false, error: response.message);
      }
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(isLoadingTree: false, error: e.toString());
    }
  }

  Future<void> fetchFileContent(String path) async {
    state = state.copyWith(isLoadingContent: true, error: null);
    try {
      final response = await _api.getFileContent(path);
      if (!mounted) return;
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
      if (!mounted) return;
      state = state.copyWith(isLoadingContent: false, error: e.toString());
    }
  }

  void clearSelectedFile() {
    state = state.copyWith(clearSelectedFile: true);
  }

  void navigateTo(String path) {
    fetchTree(path: path);
  }

  Future<void> setSort(FileSortKey key, FileSortOrder order) async {
    state = state.copyWith(
      sortKey: key,
      sortOrder: order,
      tree: _sortTree(state.tree, key, order),
    );
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    await prefs.setString(AppConfig.keyFileSortKey, key.name);
    await prefs.setString(AppConfig.keyFileSortOrder, order.name);
  }

  /// Sort tree: directories always first, then sort by key within each group.
  static List<FileNode> _sortTree(
    List<FileNode> tree,
    FileSortKey key,
    FileSortOrder order,
  ) {
    final dirs = tree.where((n) => n.isDirectory).toList();
    final files = tree.where((n) => !n.isDirectory).toList();

    int Function(FileNode, FileNode) comparator;
    switch (key) {
      case FileSortKey.name:
        comparator = (a, b) =>
            a.name.toLowerCase().compareTo(b.name.toLowerCase());
        break;
      case FileSortKey.modified:
        comparator = (a, b) {
          final aTime = a.modified ?? DateTime.fromMillisecondsSinceEpoch(0);
          final bTime = b.modified ?? DateTime.fromMillisecondsSinceEpoch(0);
          return aTime.compareTo(bTime);
        };
        break;
    }

    if (order == FileSortOrder.descending) {
      final base = comparator;
      comparator = (a, b) => base(b, a);
    }

    dirs.sort(comparator);
    files.sort(comparator);

    return [...dirs, ...files];
  }
}
