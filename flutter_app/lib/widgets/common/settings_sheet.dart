import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/server_provider.dart';
import '../../providers/theme_provider.dart';

class SettingsSheet extends ConsumerStatefulWidget {
  const SettingsSheet({super.key});

  @override
  ConsumerState<SettingsSheet> createState() => _SettingsSheetState();
}

class _SettingsSheetState extends ConsumerState<SettingsSheet> {
  late TextEditingController _newUrlController;
  late TextEditingController _newNameController;
  final FocusNode _nameFocusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _newUrlController = TextEditingController();
    _newNameController = TextEditingController();
  }

  @override
  void dispose() {
    _newUrlController.dispose();
    _newNameController.dispose();
    _nameFocusNode.dispose();
    super.dispose();
  }

  Future<void> _addUrl() async {
    final url = _newUrlController.text.trim();
    if (url.isEmpty) return;
    final name = _newNameController.text.trim();
    ref.read(serverProvider.notifier).addEntry(url, name: name);
    _newUrlController.clear();
    _newNameController.clear();
  }

  Future<void> _removeUrl(int index) async {
    final wasFirst = index == 0;
    ref.read(serverProvider.notifier).removeUrl(index);

    if (wasFirst && mounted) {
      final entries = ref.read(serverProvider).entries;
      if (entries.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Switched to ${entries.first.displayName}')),
        );
      }
    }
  }

  Future<void> _editName(int index, ServerEntry entry) async {
    final controller = TextEditingController(text: entry.name);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Name'),
        content: TextField(
          controller: controller,
          decoration: InputDecoration(
            hintText: entry.url,
            border: const OutlineInputBorder(),
          ),
          autofocus: true,
          onSubmitted: (value) => Navigator.of(context).pop(value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (result != null) {
      ref.read(serverProvider.notifier).updateName(index, result);
    }
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
  Widget build(BuildContext context) {
    final isDarkMode = ref.watch(themeProvider);
    final serverState = ref.watch(serverProvider);
    final entries = serverState.entries;

    return SingleChildScrollView(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Settings',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          // Dark mode toggle
          SwitchListTile(
            title: const Text('Dark Mode'),
            subtitle: const Text('ダークモード'),
            value: isDarkMode,
            onChanged: (_) =>
                ref.read(themeProvider.notifier).toggle(),
          ),
          const Divider(),
          // Backend URLs
          Text('Backend URLs',
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          // URL list
          ..._buildUrlList(entries, serverState),
          const Divider(),
          // Add new URL
          Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    TextField(
                      controller: _newUrlController,
                      decoration: const InputDecoration(
                        hintText: 'http://10.0.2.2:8000',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      style: const TextStyle(fontSize: 14),
                      textInputAction: TextInputAction.next,
                      onSubmitted: (_) =>
                          _nameFocusNode.requestFocus(),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _newNameController,
                      focusNode: _nameFocusNode,
                      decoration: const InputDecoration(
                        hintText: 'Name (optional)',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      style: const TextStyle(fontSize: 14),
                      onSubmitted: (_) => _addUrl(),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _addUrl,
                child: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Emulator: http://10.0.2.2:8000\nDevice: http://<host-ip>:8000',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).hintColor,
                ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildUrlList(
      List<ServerEntry> entries, ServerState serverState) {
    return List.generate(entries.length, (index) {
      final entry = entries[index];
      final isActive = index == 0;
      final health = serverState.healthOf(entry.url);
      final hasName = entry.name.isNotEmpty;
      return ListTile(
        dense: true,
        leading: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _healthDotColor(health),
              ),
            ),
            const SizedBox(width: 8),
            if (isActive)
              Icon(Icons.check_circle, color: Colors.green, size: 20)
            else
              const SizedBox(width: 20),
          ],
        ),
        title: Text(
          entry.displayName,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: hasName
            ? Text(entry.url,
                style: const TextStyle(fontSize: 12))
            : (isActive ? const Text('Active') : null),
        onTap: () => _editName(index, entry),
        trailing: entries.length > 1
            ? IconButton(
                icon: const Icon(Icons.close, size: 18),
                onPressed: () => _removeUrl(index),
                tooltip: 'Remove',
              )
            : null,
      );
    });
  }
}
