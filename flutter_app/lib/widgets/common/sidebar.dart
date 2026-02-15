import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/server_provider.dart';
import '../../providers/view_provider.dart';
import '../session/session_tree_view.dart';
import '../file/file_explorer.dart';

class Sidebar extends ConsumerWidget {
  const Sidebar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final viewMode = ref.watch(viewProvider);

    return Column(
      children: [
        // Server dropdown
        const _ServerDropdown(),
        const Divider(height: 1),
        // Tab bar
        Material(
          color: Theme.of(context).colorScheme.surface,
          child: Row(
            children: [
              Expanded(
                child: _TabButton(
                  label: 'Sessions',
                  icon: Icons.terminal,
                  isSelected: viewMode == ViewMode.tmux,
                  onTap: () =>
                      ref.read(viewProvider.notifier).setMode(ViewMode.tmux),
                ),
              ),
              Expanded(
                child: _TabButton(
                  label: 'Files',
                  icon: Icons.folder,
                  isSelected: viewMode == ViewMode.file,
                  onTap: () =>
                      ref.read(viewProvider.notifier).setMode(ViewMode.file),
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        // Content
        Expanded(
          child: viewMode == ViewMode.tmux
              ? const SessionTreeView()
              : const FileExplorer(),
        ),
      ],
    );
  }
}

class _ServerDropdown extends ConsumerWidget {
  const _ServerDropdown();

  /// Strip "http://" prefix for display.
  String _displayUrl(String url) {
    return url.replaceFirst(RegExp(r'^https?://'), '');
  }

  Color _healthDotColor(ServerHealthStatus status) {
    switch (status) {
      case ServerHealthStatus.healthy:
        return Colors.green;
      case ServerHealthStatus.unhealthy:
        return Colors.red;
      case ServerHealthStatus.unknown:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final serverState = ref.watch(serverProvider);
    final urls = serverState.urls;

    if (urls.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: DropdownButton<int>(
        value: 0,
        isExpanded: true,
        underline: const SizedBox.shrink(),
        icon: const Icon(Icons.arrow_drop_down, size: 24),
        items: List.generate(urls.length, (index) {
          final url = urls[index];
          final health = serverState.healthOf(url);
          final isUnhealthy = health == ServerHealthStatus.unhealthy;

          return DropdownMenuItem<int>(
            value: index,
            enabled: index == 0 || !isUnhealthy,
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _healthDotColor(health),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _displayUrl(url),
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      color: isUnhealthy && index != 0
                          ? Theme.of(context).disabledColor
                          : null,
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
        onChanged: (index) {
          if (index != null && index != 0) {
            ref.read(serverProvider.notifier).selectServer(index);
          }
        },
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color =
        isSelected ? theme.colorScheme.primary : theme.hintColor;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? theme.colorScheme.primary : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: color,
                fontWeight:
                    isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
