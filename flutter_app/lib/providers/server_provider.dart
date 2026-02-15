import 'dart:async';
import 'package:flutter/foundation.dart' show visibleForTesting;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import 'connection_provider.dart';
import 'file_provider.dart';
import 'output_provider.dart';
import 'session_provider.dart';
import 'websocket_provider.dart';

enum ServerHealthStatus { unknown, healthy, unhealthy }

class ServerState {
  final List<String> urls;
  final Map<String, ServerHealthStatus> healthMap;

  const ServerState({
    this.urls = const [],
    this.healthMap = const {},
  });

  /// The active server URL is always the first in the list.
  String? get activeUrl => urls.isNotEmpty ? urls.first : null;

  ServerHealthStatus healthOf(String url) =>
      healthMap[url] ?? ServerHealthStatus.unknown;

  ServerState copyWith({
    List<String>? urls,
    Map<String, ServerHealthStatus>? healthMap,
  }) {
    return ServerState(
      urls: urls ?? this.urls,
      healthMap: healthMap ?? this.healthMap,
    );
  }
}

final serverProvider =
    StateNotifierProvider<ServerNotifier, ServerState>((ref) {
  return ServerNotifier(ref);
});

typedef HealthChecker = Future<bool> Function(String url);

class ServerNotifier extends StateNotifier<ServerState> {
  final Ref _ref;
  Timer? _healthTimer;
  final HealthChecker _healthChecker;

  ServerNotifier(this._ref, {HealthChecker? healthChecker})
      : _healthChecker = healthChecker ?? ApiService.checkUrlHealth,
        super(const ServerState()) {
    _loadUrls();
  }

  /// Test-only constructor: skips _loadUrls() and timers.
  @visibleForTesting
  ServerNotifier.noInit(this._ref, {HealthChecker? healthChecker})
      : _healthChecker = healthChecker ?? ApiService.checkUrlHealth,
        super(const ServerState());

  /// Exposed for tests to set initial state without triggering async init.
  @visibleForTesting
  set debugState(ServerState value) => state = value;

  Future<void> _loadUrls() async {
    final prefs = await SharedPreferences.getInstance();
    final urls = prefs.getStringList(AppConfig.keyBackendUrls);
    if (urls != null && urls.isNotEmpty) {
      state = state.copyWith(urls: List<String>.from(urls));
    } else {
      // Migrate from old single-URL key
      final oldUrl = prefs.getString(AppConfig.keyBackendUrl);
      if (oldUrl != null && oldUrl.isNotEmpty) {
        state = state.copyWith(urls: [oldUrl]);
        await prefs.setStringList(AppConfig.keyBackendUrls, [oldUrl]);
      } else {
        state = state.copyWith(urls: [AppConfig.backendUrl]);
        await prefs.setStringList(
            AppConfig.keyBackendUrls, [AppConfig.backendUrl]);
      }
    }
    _startHealthChecks();
  }

  void _startHealthChecks() {
    _checkAllHealth();
    _healthTimer =
        Timer.periodic(const Duration(seconds: 10), (_) => _checkAllHealth());
  }

  Future<void> _checkAllHealth() async {
    final urls = state.urls;
    if (urls.isEmpty) return;

    final futures = urls.map((url) async {
      final healthy = await _healthChecker(url);
      return MapEntry(
          url,
          healthy
              ? ServerHealthStatus.healthy
              : ServerHealthStatus.unhealthy);
    });

    final entries = await Future.wait(futures);
    if (!mounted) return;

    final newMap = Map<String, ServerHealthStatus>.fromEntries(entries);
    state = state.copyWith(healthMap: newMap);
  }

  /// Select a server by moving it to index 0 (making it active).
  Future<void> selectServer(int index) async {
    if (index < 0 || index >= state.urls.length || index == 0) return;

    final newUrls = List<String>.from(state.urls);
    final selected = newUrls.removeAt(index);
    newUrls.insert(0, selected);
    state = state.copyWith(urls: newUrls);
    await _saveUrls();
    _applyConnection(selected);
  }

  /// Add a new URL to the end of the list.
  Future<void> addUrl(String url) async {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return;

    // Validate URL format: must have http/https scheme and a host.
    final uri = Uri.tryParse(trimmed);
    if (uri == null ||
        !uri.hasScheme ||
        !{'http', 'https'}.contains(uri.scheme) ||
        !uri.hasAuthority ||
        uri.host.isEmpty) {
      return;
    }

    if (state.urls.contains(trimmed)) return;

    state = state.copyWith(urls: [...state.urls, trimmed]);
    await _saveUrls();

    // Immediately check health of the new URL
    final healthy = await _healthChecker(trimmed);
    if (!mounted) return;
    final newMap = Map<String, ServerHealthStatus>.from(state.healthMap);
    newMap[trimmed] =
        healthy ? ServerHealthStatus.healthy : ServerHealthStatus.unhealthy;
    state = state.copyWith(healthMap: newMap);
  }

  /// Remove a URL by index. Cannot remove the last URL.
  Future<void> removeUrl(int index) async {
    if (state.urls.length <= 1) return;
    if (index < 0 || index >= state.urls.length) return;

    final wasFirst = index == 0;
    final newUrls = List<String>.from(state.urls);
    newUrls.removeAt(index);
    state = state.copyWith(urls: newUrls);
    await _saveUrls();

    if (wasFirst) {
      _applyConnection(newUrls.first);
    }
  }

  Future<void> _applyConnection(String url) async {
    final normalized = url.replaceAll(RegExp(r'/+$'), '');
    AppConfig.setSavedBackendUrl(url);
    _ref.read(apiServiceProvider).updateBaseUrl('$normalized/api');
    final uri = Uri.parse(normalized);
    final wsScheme = uri.scheme == 'https' ? 'wss' : 'ws';
    _ref.read(websocketServiceProvider).updateBaseUrl(
        '${uri.replace(scheme: wsScheme)}/api/tmux/ws');
    _ref.read(connectionProvider.notifier).testConnection();
    _ref.read(sessionProvider.notifier).reset();
    _ref.read(fileProvider.notifier).reset();

    // Fetch hierarchy first, then select a valid target before reconnecting WS.
    await _ref.read(sessionProvider.notifier).fetchHierarchy();
    if (!mounted) return;

    final hierarchy = _ref.read(sessionProvider).hierarchy;
    if (hierarchy != null && hierarchy.sessions.isNotEmpty) {
      final firstSession = hierarchy.sessions.values.first;
      final firstWindow = firstSession.windows.isNotEmpty
          ? firstSession.windows.keys.first
          : null;
      final target = firstWindow != null
          ? '${firstSession.name}:$firstWindow'
          : firstSession.name;
      _ref.read(selectedTargetProvider.notifier).state = target;
    } else {
      _ref.read(selectedTargetProvider.notifier).state = 'default';
    }

    _ref.read(websocketServiceProvider).resetAndReconnect();
  }

  Future<void> _saveUrls() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(AppConfig.keyBackendUrls, state.urls);
  }

  @override
  void dispose() {
    _healthTimer?.cancel();
    super.dispose();
  }
}
