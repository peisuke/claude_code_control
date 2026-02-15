import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/websocket_service.dart';
import '../models/tmux_output.dart';

final websocketServiceProvider =
    Provider.autoDispose<WebSocketService>((ref) {
  final service = WebSocketService();
  ref.onDispose(service.dispose);
  return service;
});

final wsConnectionStateProvider =
    StreamProvider.autoDispose<WsConnectionState>((ref) {
  final service = ref.watch(websocketServiceProvider);
  return service.connectionState;
});

final wsMessagesProvider =
    StreamProvider.autoDispose<TmuxOutput>((ref) {
  final service = ref.watch(websocketServiceProvider);
  return service.messages;
});

final wsIsConnectedProvider = Provider.autoDispose<bool>((ref) {
  final state = ref.watch(wsConnectionStateProvider);
  return state.when(
    data: (s) => s == WsConnectionState.connected,
    loading: () => false,
    error: (_, __) => false,
  );
});
