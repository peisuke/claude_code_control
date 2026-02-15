import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/tmux_session.dart';
import '../../providers/output_provider.dart';
import '../../providers/session_provider.dart';
import '../../providers/websocket_provider.dart';
import 'delete_confirmation_dialog.dart';

class SessionTreeView extends ConsumerStatefulWidget {
  const SessionTreeView({super.key});

  @override
  ConsumerState<SessionTreeView> createState() => _SessionTreeViewState();
}

class _SessionTreeViewState extends ConsumerState<SessionTreeView> {
  final Set<String> _expandedSessions = {};

  @override
  Widget build(BuildContext context) {
    final sessionState = ref.watch(sessionProvider);
    final selectedTarget = ref.watch(selectedTargetProvider);
    final theme = Theme.of(context);

    if (sessionState.isLoading && sessionState.hierarchy == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (sessionState.error != null && sessionState.hierarchy == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Error: ${sessionState.error}'),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () =>
                  ref.read(sessionProvider.notifier).fetchHierarchy(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final hierarchy = sessionState.hierarchy;
    if (hierarchy == null || hierarchy.sessions.isEmpty) {
      return const Center(child: Text('No sessions'));
    }

    // Auto-expand session containing selected target
    final targetSession = selectedTarget.split(':').first;
    if (!_expandedSessions.contains(targetSession)) {
      _expandedSessions.add(targetSession);
    }

    return Column(
      children: [
        // Action bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            children: [
              Expanded(
                child: Text('Sessions',
                    style: theme.textTheme.titleSmall),
              ),
              IconButton(
                icon: const Icon(Icons.refresh, size: 20),
                onPressed: () =>
                    ref.read(sessionProvider.notifier).fetchHierarchy(),
                tooltip: 'Refresh',
                iconSize: 20,
              ),
              IconButton(
                icon: const Icon(Icons.add, size: 20),
                onPressed: () => _createSession(context),
                tooltip: 'New session',
                iconSize: 20,
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        // Session tree
        Expanded(
          child: ListView(
            children: hierarchy.sessions.entries.map((entry) {
              return _buildSessionTile(
                  context, entry.key, entry.value, selectedTarget);
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildSessionTile(BuildContext context, String sessionName,
      TmuxSession session, String selectedTarget) {
    final isExpanded = _expandedSessions.contains(sessionName);
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        InkWell(
          onTap: () {
            setState(() {
              if (isExpanded) {
                _expandedSessions.remove(sessionName);
              } else {
                _expandedSessions.add(sessionName);
              }
            });
          },
          child: Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              children: [
                Icon(
                  isExpanded ? Icons.expand_more : Icons.chevron_right,
                  size: 20,
                ),
                const SizedBox(width: 4),
                const Icon(Icons.folder, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    sessionName,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: selectedTarget.startsWith(sessionName)
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                ),
                // Add window button
                IconButton(
                  icon: const Icon(Icons.add, size: 16),
                  onPressed: () => _createWindow(context, sessionName),
                  tooltip: 'New window',
                  constraints: const BoxConstraints(
                      minWidth: 28, minHeight: 28),
                  padding: EdgeInsets.zero,
                  iconSize: 16,
                ),
                // Delete session button
                if ((ref.read(sessionProvider).hierarchy?.sessions.length ??
                        0) >
                    1)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 16),
                    onPressed: () =>
                        _confirmDeleteSession(context, sessionName),
                    tooltip: 'Delete session',
                    constraints: const BoxConstraints(
                        minWidth: 28, minHeight: 28),
                    padding: EdgeInsets.zero,
                    iconSize: 16,
                  ),
              ],
            ),
          ),
        ),
        if (isExpanded)
          ...session.windows.entries.map((wEntry) {
            return _buildWindowTile(
              context,
              sessionName,
              wEntry.key,
              wEntry.value,
              selectedTarget,
              session.windows.length,
            );
          }),
      ],
    );
  }

  Widget _buildWindowTile(
    BuildContext context,
    String sessionName,
    String windowIndex,
    TmuxWindow window,
    String selectedTarget,
    int totalWindows,
  ) {
    final target = '$sessionName:$windowIndex';
    final isSelected = selectedTarget == target ||
        selectedTarget.startsWith('$target.');
    final theme = Theme.of(context);
    final hasPanes = window.panes.length > 1;

    return Column(
      children: [
        InkWell(
          onTap: () {
            ref.read(selectedTargetProvider.notifier).state = target;
            ref.read(websocketServiceProvider).setTarget(target);
            Navigator.of(context).pop(); // Close drawer
          },
          child: Container(
            color: isSelected
                ? theme.colorScheme.primaryContainer.withValues(alpha: 0.3)
                : null,
            padding: const EdgeInsets.only(
                left: 32, right: 8, top: 4, bottom: 4),
            child: Row(
              children: [
                Icon(
                  Icons.web_asset,
                  size: 16,
                  color: isSelected
                      ? theme.colorScheme.primary
                      : null,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '$windowIndex: ${window.name}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected
                          ? theme.colorScheme.primary
                          : null,
                    ),
                  ),
                ),
                if (totalWindows > 1)
                  IconButton(
                    icon: const Icon(Icons.close, size: 14),
                    onPressed: () => _confirmDeleteWindow(
                        context, sessionName, windowIndex),
                    tooltip: 'Delete window',
                    constraints: const BoxConstraints(
                        minWidth: 24, minHeight: 24),
                    padding: EdgeInsets.zero,
                    iconSize: 14,
                  ),
              ],
            ),
          ),
        ),
        // Show panes if multiple
        if (hasPanes)
          ...window.panes.entries.map((pEntry) {
            final paneTarget = '$target.${pEntry.key}';
            final isPaneSelected = selectedTarget == paneTarget;
            return InkWell(
              onTap: () {
                ref.read(selectedTargetProvider.notifier).state = paneTarget;
                ref.read(websocketServiceProvider).setTarget(paneTarget);
                Navigator.of(context).pop(); // Close drawer
              },
              child: Container(
                color: isPaneSelected
                    ? theme.colorScheme.primaryContainer
                        .withValues(alpha: 0.3)
                    : null,
                padding: const EdgeInsets.only(
                    left: 52, right: 8, top: 2, bottom: 2),
                child: Row(
                  children: [
                    Icon(Icons.tab, size: 14,
                        color: isPaneSelected
                            ? theme.colorScheme.primary
                            : null),
                    const SizedBox(width: 6),
                    Text(
                      'Pane ${pEntry.key}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: isPaneSelected
                            ? FontWeight.bold
                            : FontWeight.normal,
                        color: isPaneSelected
                            ? theme.colorScheme.primary
                            : null,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Future<void> _createSession(BuildContext context) async {
    final hierarchy = ref.read(sessionProvider).hierarchy;
    final existingNames =
        hierarchy?.sessions.keys.toSet() ?? <String>{};
    // Auto-generate next numeric name
    var idx = 0;
    while (existingNames.contains(idx.toString())) {
      idx++;
    }
    final name = idx.toString();
    await ref.read(sessionProvider.notifier).createSession(name);
  }

  Future<void> _createWindow(
      BuildContext context, String sessionName) async {
    await ref.read(sessionProvider.notifier).createWindow(sessionName);
  }

  Future<void> _confirmDeleteSession(
      BuildContext context, String sessionName) async {
    final confirmed = await showDeleteConfirmationDialog(
      context,
      title: 'Delete Session',
      message: 'Delete session "$sessionName" and all its windows?',
    );
    if (confirmed == true) {
      await ref.read(sessionProvider.notifier).deleteSession(sessionName);
    }
  }

  Future<void> _confirmDeleteWindow(
      BuildContext context, String sessionName, String windowIndex) async {
    final confirmed = await showDeleteConfirmationDialog(
      context,
      title: 'Delete Window',
      message:
          'Delete window $windowIndex in session "$sessionName"?',
    );
    if (confirmed == true) {
      await ref
          .read(sessionProvider.notifier)
          .deleteWindow(sessionName, windowIndex);
    }
  }
}
