import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

enum HttpConnectionState { connecting, connected, disconnected }

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});

final connectionProvider =
    StateNotifierProvider<ConnectionNotifier, HttpConnectionState>((ref) {
  return ConnectionNotifier(ref.watch(apiServiceProvider));
});

class ConnectionNotifier extends StateNotifier<HttpConnectionState> {
  final ApiService _api;
  Timer? _checkTimer;
  bool _checking = false;

  ConnectionNotifier(this._api) : super(HttpConnectionState.connecting) {
    _startChecking();
  }

  bool get isConnected => state == HttpConnectionState.connected;

  void _startChecking() {
    _check();
    _checkTimer = Timer.periodic(const Duration(seconds: 5), (_) => _check());
  }

  Future<void> _check() async {
    if (_checking) return;
    _checking = true;
    try {
      final result = await _api.testConnection();
      if (!mounted) return;
      state = result.success
          ? HttpConnectionState.connected
          : HttpConnectionState.disconnected;
    } catch (_) {
      if (!mounted) return;
      state = HttpConnectionState.disconnected;
    } finally {
      _checking = false;
    }
  }

  Future<void> testConnection() async => _check();

  @override
  void dispose() {
    _checkTimer?.cancel();
    super.dispose();
  }
}
