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

  @override
  void initState() {
    super.initState();
    _newUrlController = TextEditingController();
  }

  @override
  void dispose() {
    _newUrlController.dispose();
    super.dispose();
  }

  Future<void> _addUrl() async {
    final url = _newUrlController.text.trim();
    if (url.isEmpty) return;
    ref.read(serverProvider.notifier).addUrl(url);
    _newUrlController.clear();
  }

  Future<void> _removeUrl(int index) async {
    final wasFirst = index == 0;
    ref.read(serverProvider.notifier).removeUrl(index);

    if (wasFirst && mounted) {
      final urls = ref.read(serverProvider).urls;
      if (urls.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Switched to ${urls.first}')),
        );
      }
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
    final urls = serverState.urls;

    return Padding(
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
          ..._buildUrlList(urls, serverState),
          const Divider(),
          // Add new URL
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _newUrlController,
                  decoration: const InputDecoration(
                    hintText: 'http://10.0.2.2:8000',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  style: const TextStyle(fontSize: 14),
                  onSubmitted: (_) => _addUrl(),
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

  List<Widget> _buildUrlList(List<String> urls, ServerState serverState) {
    return List.generate(urls.length, (index) {
      final isActive = index == 0;
      final health = serverState.healthOf(urls[index]);
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
          urls[index],
          style: TextStyle(
            fontSize: 14,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: isActive ? const Text('Active') : null,
        trailing: urls.length > 1
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
