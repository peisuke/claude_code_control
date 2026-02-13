import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/app_config.dart';
import '../../providers/theme_provider.dart';
import '../../providers/connection_provider.dart';
import '../../providers/websocket_provider.dart';

class SettingsSheet extends ConsumerStatefulWidget {
  const SettingsSheet({super.key});

  @override
  ConsumerState<SettingsSheet> createState() => _SettingsSheetState();
}

class _SettingsSheetState extends ConsumerState<SettingsSheet> {
  late TextEditingController _urlController;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController();
    _loadUrl();
  }

  Future<void> _loadUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final url =
        prefs.getString(AppConfig.keyBackendUrl) ?? AppConfig.backendUrl;
    _urlController.text = url;
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _saveUrl() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConfig.keyBackendUrl, url);

    // Update services
    ref.read(apiServiceProvider).updateBaseUrl('$url/api');
    ref.read(websocketServiceProvider).updateBaseUrl(
        '${url.replaceFirst('http', 'ws')}/api/tmux/ws');

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('URL updated. Reconnecting...')),
      );
    }

    // Test connection
    ref.read(connectionProvider.notifier).testConnection();
    ref.read(websocketServiceProvider).resetAndReconnect();
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = ref.watch(themeProvider);

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
          // Backend URL
          Text('Backend URL',
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _urlController,
                  decoration: const InputDecoration(
                    hintText: 'http://10.0.2.2:8000',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  style: const TextStyle(fontSize: 14),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _saveUrl,
                child: const Text('Save'),
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
}
