import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/connection_provider.dart';
import '../../providers/websocket_provider.dart';

class ConnectionStatus extends ConsumerWidget {
  const ConnectionStatus({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final httpState = ref.watch(connectionProvider);
    final wsConnected = ref.watch(wsIsConnectedProvider);

    final Color color;
    final String label;
    final IconData icon;
    final bool isDisconnected;

    if (httpState == HttpConnectionState.connected && wsConnected) {
      color = Colors.green;
      label = 'Connected';
      icon = Icons.cloud_done;
      isDisconnected = false;
    } else if (httpState == HttpConnectionState.connected) {
      color = Colors.orange;
      label = 'WS Disconnected';
      icon = Icons.cloud_off;
      isDisconnected = true;
    } else if (httpState == HttpConnectionState.connecting) {
      color = Colors.blue;
      label = 'Connecting';
      icon = Icons.cloud_sync;
      isDisconnected = false;
    } else {
      color = Colors.red;
      label = 'Disconnected';
      icon = Icons.cloud_off;
      isDisconnected = true;
    }

    final chip = Chip(
      avatar: Icon(icon, size: 16, color: color),
      label: Text(label, style: TextStyle(fontSize: 12, color: color)),
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );

    if (!isDisconnected) return chip;

    return GestureDetector(
      onTap: () => ref.read(websocketServiceProvider).resetAndReconnect(),
      child: chip,
    );
  }
}
