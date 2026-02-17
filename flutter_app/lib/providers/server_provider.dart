import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart' show visibleForTesting;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import 'connection_provider.dart';
import 'file_provider.dart';
import 'output_provider.dart';
import 'session_provider.dart';
import 'terminal_resize_provider.dart';
import 'websocket_provider.dart';

enum ServerHealthStatus { unknown, healthy, unhealthy }

class ServerEntry {
  final String url;
  final String name;

  const ServerEntry({required this.url, this.name = ''});

  String get displayName => name.isNotEmpty ? name : url;

  Map<String, String> toJson() => {'url': url, 'name': name};

  factory ServerEntry.fromJson(Map<String, dynamic> j) =>
      ServerEntry(url: j['url'] as String, name: j['name'] as String? ?? '');

  ServerEntry copyWith({String? name}) =>
      ServerEntry(url: url, name: name ?? this.name);
}

class ServerState {
  final List<ServerEntry> entries;
  final Map<String, ServerHealthStatus> healthMap;

  const ServerState({
    this.entries = const [],
    this.healthMap = const {},
  });

  /// Convenience getter: list of URLs from entries.
  List<String> get urls => entries.map((e) => e.url).toList();

  /// The active server URL is always the first in the list.
  String? get activeUrl => entries.isNotEmpty ? entries.first.url : null;

  ServerHealthStatus healthOf(String url) =>
      healthMap[url] ?? ServerHealthStatus.unknown;

  ServerState copyWith({
    List<ServerEntry>? entries,
    Map<String, ServerHealthStatus>? healthMap,
  }) {
    return ServerState(
      entries: entries ?? this.entries,
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

    // Try new JSON-based entries key first
    final entriesJson = prefs.getStringList(AppConfig.keyBackendEntries);
    if (entriesJson != null && entriesJson.isNotEmpty) {
      final entries = entriesJson
          .map((s) => ServerEntry.fromJson(
              jsonDecode(s) as Map<String, dynamic>))
          .toList();
      state = state.copyWith(entries: entries);
    } else {
      // Migrate from old List<String> URLs key
      final urls = prefs.getStringList(AppConfig.keyBackendUrls);
      if (urls != null && urls.isNotEmpty) {
        final entries =
            urls.map((u) => ServerEntry(url: u)).toList();
        state = state.copyWith(entries: entries);
      } else {
        // Migrate from old single-URL key
        final oldUrl = prefs.getString(AppConfig.keyBackendUrl);
        if (oldUrl != null && oldUrl.isNotEmpty) {
          state = state.copyWith(entries: [ServerEntry(url: oldUrl)]);
        } else {
          state = state.copyWith(
              entries: [ServerEntry(url: AppConfig.backendUrl)]);
        }
      }
      // Persist in new format
      await _saveUrls();
    }
    _startHealthChecks();
  }

  void _startHealthChecks() {
    _checkAllHealth();
    _healthTimer =
        Timer.periodic(const Duration(seconds: 10), (_) => _checkAllHealth());
  }

  Future<void> _checkAllHealth() async {
    final entries = state.entries;
    if (entries.isEmpty) return;

    final futures = entries.map((entry) async {
      final healthy = await _healthChecker(entry.url);
      return MapEntry(
          entry.url,
          healthy
              ? ServerHealthStatus.healthy
              : ServerHealthStatus.unhealthy);
    });

    final results = await Future.wait(futures);
    if (!mounted) return;

    final newMap = Map<String, ServerHealthStatus>.fromEntries(results);
    state = state.copyWith(healthMap: newMap);
  }

  /// Select a server by moving it to index 0 (making it active).
  Future<void> selectServer(int index) async {
    if (index < 0 || index >= state.entries.length || index == 0) return;

    final newEntries = List<ServerEntry>.from(state.entries);
    final selected = newEntries.removeAt(index);
    newEntries.insert(0, selected);
    state = state.copyWith(entries: newEntries);
    await _saveUrls();
    await _applyConnection(selected.url);
  }

  /// Add a new server entry to the end of the list.
  Future<void> addEntry(String url, {String name = ''}) async {
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

    // Strip trailing /api (and trailing slashes) to prevent double /api
    // when _applyConnection appends /api. Preserve other path prefixes
    // for path-based deployments (e.g. https://host/tmux-control).
    final cleanPath = uri.path
        .replaceAll(RegExp(r'/api/?$'), '')
        .replaceAll(RegExp(r'/+$'), '');
    final normalized = '${uri.scheme}://${uri.authority}$cleanPath';

    final existingIndex =
        state.entries.indexWhere((e) => e.url == normalized);
    if (existingIndex >= 0) {
      // URL already exists — update name if provided, otherwise no-op.
      final trimmedName = name.trim();
      if (trimmedName.isNotEmpty) {
        await updateName(existingIndex, trimmedName);
      }
      return;
    }

    final entry = ServerEntry(url: normalized, name: name.trim());
    state = state.copyWith(entries: [...state.entries, entry]);
    await _saveUrls();

    // Immediately check health of the new URL
    final healthy = await _healthChecker(normalized);
    if (!mounted) return;
    final newMap = Map<String, ServerHealthStatus>.from(state.healthMap);
    newMap[normalized] =
        healthy ? ServerHealthStatus.healthy : ServerHealthStatus.unhealthy;
    state = state.copyWith(healthMap: newMap);
  }

  /// Backwards-compatible alias for addEntry.
  Future<void> addUrl(String url) => addEntry(url);

  /// Update the display name of a server entry at [index].
  Future<void> updateName(int index, String name) async {
    if (index < 0 || index >= state.entries.length) return;

    final newEntries = List<ServerEntry>.from(state.entries);
    newEntries[index] = newEntries[index].copyWith(name: name.trim());
    state = state.copyWith(entries: newEntries);
    await _saveUrls();
  }

  /// Remove a server entry by index. Cannot remove the last entry.
  Future<void> removeUrl(int index) async {
    if (state.entries.length <= 1) return;
    if (index < 0 || index >= state.entries.length) return;

    final wasFirst = index == 0;
    final newEntries = List<ServerEntry>.from(state.entries);
    newEntries.removeAt(index);
    state = state.copyWith(entries: newEntries);
    await _saveUrls();

    if (wasFirst) {
      _applyConnection(newEntries.first.url);
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
      _ref.read(websocketServiceProvider).setTarget(target);
      _ref.read(websocketServiceProvider).resetAndReconnect();
      _ref.read(terminalResizeProvider.notifier).retrySend();
      _ref.read(fileProvider.notifier).fetchTree();
    } else {
      // No sessions — clear WS target and disconnect.
      _ref.read(selectedTargetProvider.notifier).state = '';
      _ref.read(websocketServiceProvider).setTarget('');
      _ref.read(websocketServiceProvider).disconnect();
    }
  }

  Future<void> _saveUrls() async {
    final prefs = await SharedPreferences.getInstance();
    final entriesJson =
        state.entries.map((e) => jsonEncode(e.toJson())).toList();
    await prefs.setStringList(AppConfig.keyBackendEntries, entriesJson);
    // Also keep old key in sync for backwards compatibility during rollback
    await prefs.setStringList(AppConfig.keyBackendUrls, state.urls);
  }

  @override
  void dispose() {
    _healthTimer?.cancel();
    super.dispose();
  }
}
