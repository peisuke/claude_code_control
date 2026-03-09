import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/file_node.dart';
import '../../providers/file_provider.dart';

class FileExplorer extends ConsumerStatefulWidget {
  const FileExplorer({super.key});

  @override
  ConsumerState<FileExplorer> createState() => _FileExplorerState();
}

class _FileExplorerState extends ConsumerState<FileExplorer> {
  @override
  void initState() {
    super.initState();
    // Fetch root directory on first load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(fileProvider);
      if (state.tree.isEmpty && !state.isLoadingTree) {
        ref.read(fileProvider.notifier).fetchTree();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(fileProvider);

    return Column(
      children: [
        // Breadcrumb navigation + sort + refresh buttons
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            children: [
              Expanded(child: _buildBreadcrumbs(context, state.currentPath)),
              _buildSortButton(context, state),
              IconButton(
                icon: const Icon(Icons.refresh, size: 20),
                onPressed: state.isLoadingTree
                    ? null
                    : () => ref
                        .read(fileProvider.notifier)
                        .fetchTree(path: state.currentPath),
                tooltip: 'Refresh',
                iconSize: 20,
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        // File tree
        Expanded(
          child: state.isLoadingTree
              ? const Center(child: CircularProgressIndicator())
              : state.treeError != null && state.tree.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.error_outline,
                                color:
                                    Theme.of(context).colorScheme.error),
                            const SizedBox(height: 8),
                            Text(
                              state.treeError!,
                              style: TextStyle(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .error),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            TextButton.icon(
                              onPressed: () => ref
                                  .read(fileProvider.notifier)
                                  .fetchTree(path: state.currentPath),
                              icon: const Icon(Icons.refresh, size: 18),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : state.tree.isEmpty
                      ? const Center(child: Text('Empty directory'))
                      : ListView(
                      children: [
                        // Parent directory
                        if (state.currentPath != '/')
                          ListTile(
                            leading: const Icon(Icons.folder_open, size: 20),
                            title: const Text('..'),
                            dense: true,
                            onTap: () {
                              final parent = state.currentPath
                                  .substring(
                                      0,
                                      state.currentPath
                                          .lastIndexOf('/'));
                              ref.read(fileProvider.notifier).navigateTo(
                                  parent.isEmpty ? '/' : parent);
                            },
                          ),
                        ...state.tree.map((node) =>
                            _buildFileNode(context, node)),
                      ],
                    ),
        ),
      ],
    );
  }

  Widget _buildSortButton(BuildContext context, FileState state) {
    return PopupMenuButton<_SortOption>(
      icon: const Icon(Icons.sort, size: 20),
      tooltip: 'Sort',
      iconSize: 20,
      onSelected: (option) {
        ref.read(fileProvider.notifier).setSort(option.key, option.order);
      },
      itemBuilder: (context) {
        final currentKey = state.sortKey;
        final currentOrder = state.sortOrder;
        final hasModified = state.tree.any((n) => n.modified != null);

        return [
          _sortMenuItem(
            label: 'Name (A-Z)',
            key: FileSortKey.name,
            order: FileSortOrder.ascending,
            currentKey: currentKey,
            currentOrder: currentOrder,
          ),
          _sortMenuItem(
            label: 'Name (Z-A)',
            key: FileSortKey.name,
            order: FileSortOrder.descending,
            currentKey: currentKey,
            currentOrder: currentOrder,
          ),
          if (hasModified)
            _sortMenuItem(
              label: 'Date (oldest)',
              key: FileSortKey.modified,
              order: FileSortOrder.ascending,
              currentKey: currentKey,
              currentOrder: currentOrder,
            ),
          if (hasModified)
            _sortMenuItem(
              label: 'Date (newest)',
              key: FileSortKey.modified,
              order: FileSortOrder.descending,
              currentKey: currentKey,
              currentOrder: currentOrder,
            ),
        ];
      },
    );
  }

  PopupMenuItem<_SortOption> _sortMenuItem({
    required String label,
    required FileSortKey key,
    required FileSortOrder order,
    required FileSortKey currentKey,
    required FileSortOrder currentOrder,
  }) {
    final isSelected = currentKey == key && currentOrder == order;
    return PopupMenuItem<_SortOption>(
      value: _SortOption(key, order),
      child: Row(
        children: [
          SizedBox(
            width: 24,
            child: isSelected
                ? const Icon(Icons.check, size: 18)
                : null,
          ),
          const SizedBox(width: 8),
          Text(label),
        ],
      ),
    );
  }

  /// Format path for display: show last 3 segments with '...' prefix when deep.
  /// Matches web formatPathDisplay(): parts.length <= 3 -> full, else '.../' + last 3.
  Widget _buildBreadcrumbs(BuildContext context, String path) {
    final allParts = path.split('/').where((p) => p.isNotEmpty).toList();
    final theme = Theme.of(context);
    final truncated = allParts.length > 3;
    final visibleParts = truncated ? allParts.sublist(allParts.length - 3) : allParts;
    // Offset into allParts so navigation targets resolve to correct full paths.
    final startIndex = allParts.length - visibleParts.length;

    return Tooltip(
      message: path.isEmpty ? '/' : path,
      child: Row(
          children: [
            InkWell(
              onTap: () =>
                  ref.read(fileProvider.notifier).navigateTo('/'),
              child: Text('/',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.primary)),
            ),
            if (truncated)
              Text(' / ...', style: theme.textTheme.bodySmall),
            for (var i = 0; i < visibleParts.length; i++) ...[
              Text(' / ', style: theme.textTheme.bodySmall),
              Flexible(
                child: InkWell(
                  onTap: () {
                    final target =
                        '/${allParts.sublist(0, startIndex + i + 1).join('/')}';
                    ref.read(fileProvider.notifier).navigateTo(target);
                  },
                  child: Text(
                    visibleParts[i],
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: i == visibleParts.length - 1
                          ? null
                          : theme.colorScheme.primary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ],
        ),
    );
  }

  Widget _buildFileNode(BuildContext context, FileNode node) {
    final icon = node.isDirectory
        ? Icons.folder
        : _getFileIcon(node.name);

    final subtitle = node.modified != null
        ? _formatDate(node.modified!)
        : null;

    return ListTile(
      leading: Icon(icon, size: 20),
      title: Text(node.name, style: Theme.of(context).textTheme.bodySmall),
      subtitle: subtitle != null
          ? Text(subtitle, style: Theme.of(context).textTheme.labelSmall)
          : null,
      dense: true,
      onTap: () {
        if (node.isDirectory) {
          ref.read(fileProvider.notifier).navigateTo(node.path);
        } else {
          ref.read(fileProvider.notifier).fetchFileContent(node.path);
          Navigator.of(context).pop(); // Close drawer
        }
      },
    );
  }

  String _formatDate(DateTime dt) {
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    if (dt.year != DateTime.now().year) {
      return '${dt.year}/$m/$d';
    }
    final h = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    return '$m/$d $h:$min';
  }

  IconData _getFileIcon(String name) {
    final ext = name.split('.').last.toLowerCase();
    switch (ext) {
      case 'dart':
      case 'ts':
      case 'js':
      case 'py':
      case 'java':
      case 'kt':
        return Icons.code;
      case 'json':
      case 'yaml':
      case 'yml':
      case 'toml':
        return Icons.data_object;
      case 'md':
      case 'txt':
      case 'rst':
        return Icons.description;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return Icons.image;
      default:
        return Icons.insert_drive_file;
    }
  }
}

class _SortOption {
  final FileSortKey key;
  final FileSortOrder order;
  const _SortOption(this.key, this.order);
}
