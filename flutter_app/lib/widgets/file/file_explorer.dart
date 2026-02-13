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
        // Breadcrumb navigation
        _buildBreadcrumbs(context, state.currentPath),
        const Divider(height: 1),
        // File tree
        Expanded(
          child: state.isLoadingTree
              ? const Center(child: CircularProgressIndicator())
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

  Widget _buildBreadcrumbs(BuildContext context, String path) {
    final parts = path.split('/').where((p) => p.isNotEmpty).toList();
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            InkWell(
              onTap: () =>
                  ref.read(fileProvider.notifier).navigateTo('/'),
              child: Text('/',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.primary)),
            ),
            for (var i = 0; i < parts.length; i++) ...[
              Text(' / ', style: theme.textTheme.bodySmall),
              InkWell(
                onTap: () {
                  final target =
                      '/${parts.sublist(0, i + 1).join('/')}';
                  ref.read(fileProvider.notifier).navigateTo(target);
                },
                child: Text(
                  parts[i],
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: i == parts.length - 1
                        ? null
                        : theme.colorScheme.primary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFileNode(BuildContext context, FileNode node) {
    final icon = node.isDirectory
        ? Icons.folder
        : _getFileIcon(node.name);

    return ListTile(
      leading: Icon(icon, size: 20),
      title: Text(node.name, style: Theme.of(context).textTheme.bodySmall),
      dense: true,
      onTap: () {
        if (node.isDirectory) {
          ref.read(fileProvider.notifier).navigateTo(node.path);
        } else {
          ref.read(fileProvider.notifier).fetchFileContent(node.path);
        }
      },
    );
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
