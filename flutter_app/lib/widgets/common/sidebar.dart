import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
