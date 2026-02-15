import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/connection_provider.dart';
import '../../providers/websocket_provider.dart';

class ConnectionStatus extends ConsumerWidget {
  const ConnectionStatus({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final httpConnected = ref.watch(connectionProvider);
    final wsConnected = ref.watch(wsIsConnectedProvider);

    final Color color;
    final String label;
    final IconData icon;

    if (httpConnected && wsConnected) {
      color = Colors.green;
      label = 'Connected';
      icon = Icons.cloud_done;
    } else if (httpConnected) {
      color = Colors.orange;
      label = 'WS Disconnected';
      icon = Icons.cloud_off;
    } else {
      color = Colors.red;
      label = 'Disconnected';
      icon = Icons.cloud_off;
    }

    return Chip(
      avatar: Icon(icon, size: 16, color: color),
      label: Text(label, style: TextStyle(fontSize: 12, color: color)),
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}
