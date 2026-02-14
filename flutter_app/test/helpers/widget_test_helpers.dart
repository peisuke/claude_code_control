/// Shared test helpers for widget tests.
///
/// Provides a [buildTestWidget] function that wraps widgets in a
/// ProviderScope + MaterialApp with overridden providers for isolated testing.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tmux_control/models/api_response.dart';
import 'package:tmux_control/models/file_node.dart';
import 'package:tmux_control/models/tmux_output.dart';
import 'package:tmux_control/models/tmux_session.dart';
import 'package:tmux_control/providers/connection_provider.dart';
import 'package:tmux_control/providers/websocket_provider.dart';
import 'package:tmux_control/services/api_service.dart';
import 'package:tmux_control/services/websocket_service.dart';

/// A no-op ApiService for widget tests.
///
/// All methods resolve immediately with controllable responses.
/// Covers all 13 API endpoints so no real Dio calls are made.
class NoOpApiService extends ApiService {
  final bool connectionSuccess;
  final String outputContent;
  final TmuxHierarchy hierarchy;
  final List<FileNode> fileTree;
  final String fileTreePath;

  final List<String> sentCommands = [];
  final List<String> sentEnters = [];

  NoOpApiService({
    this.connectionSuccess = true,
    this.outputContent = '',
    this.hierarchy = const TmuxHierarchy(sessions: {}),
    this.fileTree = const [],
    this.fileTreePath = '/',
  }) : super(baseUrl: 'http://test:0/api');

  @override
  Future<ApiResponse> testConnection() async {
    return ApiResponse(success: connectionSuccess, message: '');
  }

  @override
  Future<TmuxOutput> getOutput(
    String target, {
    bool includeHistory = false,
    int? lines,
  }) async {
    return TmuxOutput(
        content: outputContent, timestamp: '', target: target);
  }

  @override
  Future<ApiResponse> sendCommand(String command,
      {String target = 'default'}) async {
    sentCommands.add(command);
    return const ApiResponse(success: true, message: '');
  }

  @override
  Future<ApiResponse> sendEnter({String target = 'default'}) async {
    sentEnters.add(target);
    return const ApiResponse(success: true, message: '');
  }

  @override
  Future<ApiResponse<TmuxHierarchy>> getHierarchy() async {
    return ApiResponse<TmuxHierarchy>(
      success: true,
      message: '',
      data: hierarchy,
    );
  }

  @override
  Future<ApiResponse> createSession(String sessionName) async {
    return const ApiResponse(success: true, message: '');
  }

  @override
  Future<ApiResponse> deleteSession(String sessionName) async {
    return const ApiResponse(success: true, message: '');
  }

  @override
  Future<ApiResponse> createWindow(String sessionName,
      {String? windowName}) async {
    return const ApiResponse(success: true, message: '');
  }

  @override
  Future<ApiResponse> deleteWindow(
      String sessionName, String windowIndex) async {
    return const ApiResponse(success: true, message: '');
  }

  @override
  Future<ApiResponse> resizePane(String target, int cols, int rows) async {
    return const ApiResponse(success: true, message: '');
  }

  @override
  Future<ApiResponse<FileTreeResponse>> getFileTree(
      {String path = '/'}) async {
    return ApiResponse<FileTreeResponse>(
      success: true,
      message: '',
      data: FileTreeResponse(tree: fileTree, currentPath: fileTreePath),
    );
  }

  @override
  Future<ApiResponse<FileContentResponse>> getFileContent(String path) async {
    return ApiResponse<FileContentResponse>(
      success: true,
      message: '',
      data: FileContentResponse(content: '', path: path),
    );
  }

  @override
  Future<bool> healthCheck() async {
    return connectionSuccess;
  }
}

/// A no-op WebSocketService for widget tests.
///
/// All methods are no-ops — no timers, no network connections.
/// Tracks calls for verification in lifecycle / integration tests.
class NoOpWebSocketService extends WebSocketService {
  bool connectCalled = false;
  bool disconnectCalled = false;
  bool resetAndReconnectCalled = false;
  String? lastTargetSet;
  double? lastRefreshRate;

  NoOpWebSocketService() : super(wsBaseUrl: 'ws://test:0/api');

  void resetTracking() {
    connectCalled = false;
    disconnectCalled = false;
    resetAndReconnectCalled = false;
    lastTargetSet = null;
    lastRefreshRate = null;
  }

  @override
  Future<void> connect() async {
    connectCalled = true;
  }

  @override
  void disconnect() {
    disconnectCalled = true;
  }

  @override
  void setTarget(String target) {
    lastTargetSet = target;
  }

  @override
  void setRefreshRate(double interval) {
    lastRefreshRate = interval;
  }

  @override
  void resetAndReconnect() {
    resetAndReconnectCalled = true;
  }
}

/// Wraps [child] in ProviderScope + MaterialApp with overridden providers.
///
/// [httpConnected]: simulates HTTP connection state via testConnection().
/// [wsConnected]: simulates WebSocket connection state.
/// [outputContent]: initial terminal output content.
/// [extraOverrides]: additional provider overrides for specific tests.
Widget buildTestWidget(
  Widget child, {
  bool httpConnected = true,
  bool wsConnected = true,
  String outputContent = '',
  TmuxHierarchy hierarchy = const TmuxHierarchy(sessions: {}),
  List<FileNode> fileTree = const [],
  String fileTreePath = '/',
  List<Override>? extraOverrides,
}) {
  final mockApi = NoOpApiService(
    connectionSuccess: httpConnected,
    outputContent: outputContent,
    hierarchy: hierarchy,
    fileTree: fileTree,
    fileTreePath: fileTreePath,
  );

  return ProviderScope(
    overrides: [
      apiServiceProvider.overrideWithValue(mockApi),
      // Override connectionProvider to prevent Timer.periodic(5s) leak.
      connectionProvider.overrideWith((ref) {
        return ConnectionNotifier(mockApi);
      }),
      wsConnectionStateProvider.overrideWith((ref) {
        return Stream.value(wsConnected
            ? WsConnectionState.connected
            : WsConnectionState.disconnected);
      }),
      websocketServiceProvider.overrideWith((ref) {
        final service = NoOpWebSocketService();
        ref.onDispose(service.dispose);
        return service;
      }),
      ...?extraOverrides,
    ],
    child: MaterialApp(home: Scaffold(body: child)),
  );
}
