import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});

final connectionProvider =
    StateNotifierProvider<ConnectionNotifier, bool>((ref) {
  return ConnectionNotifier(ref.watch(apiServiceProvider));
});

class ConnectionNotifier extends StateNotifier<bool> {
  final ApiService _api;
  Timer? _checkTimer;

  ConnectionNotifier(this._api) : super(false) {
    _startChecking();
  }

  void _startChecking() {
    _check();
    _checkTimer = Timer.periodic(const Duration(seconds: 5), (_) => _check());
  }

  Future<void> _check() async {
    try {
      final result = await _api.testConnection();
      state = result.success;
    } catch (_) {
      state = false;
    }
  }

  Future<void> testConnection() async => _check();

  @override
  void dispose() {
    _checkTimer?.cancel();
    super.dispose();
  }
}
