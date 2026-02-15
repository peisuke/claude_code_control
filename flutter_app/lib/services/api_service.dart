import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show visibleForTesting;
import '../config/app_config.dart';
import '../models/api_response.dart';
import '../models/tmux_output.dart';
import '../models/tmux_session.dart';
import '../models/file_node.dart';

class ApiService {
  late final Dio _dio;
  String _baseUrl;

  ApiService({String? baseUrl, Dio? dio})
      : _baseUrl = baseUrl ?? AppConfig.apiBaseUrl {
    _dio = dio ??
        Dio(BaseOptions(
          baseUrl: _baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ));
  }

  /// Exposed for testing — allows interceptor inspection.
  @visibleForTesting
  Dio get dio => _dio;

  void updateBaseUrl(String newBaseUrl) {
    _baseUrl = newBaseUrl;
    _dio.options.baseUrl = newBaseUrl;
  }

  // --- Tmux endpoints ---

  Future<ApiResponse> sendCommand(String command,
      {String target = 'default'}) async {
    final response = await _dio.post('/tmux/send-command', data: {
      'command': command,
      'target': target,
    });
    return ApiResponse.fromJson(response.data as Map<String, dynamic>, null);
  }

  Future<ApiResponse> sendEnter({String target = 'default'}) async {
    final response = await _dio.post('/tmux/send-enter',
        queryParameters: {'target': target});
    return ApiResponse.fromJson(response.data as Map<String, dynamic>, null);
  }

  Future<TmuxOutput> getOutput(String target,
      {bool includeHistory = false, int? lines}) async {
    final params = <String, dynamic>{'target': target};
    if (includeHistory) {
      params['include_history'] = 'true';
      if (lines != null) {
        params['lines'] = lines.toString();
      }
    }
    final response =
        await _dio.get('/tmux/output', queryParameters: params);
    return TmuxOutput.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ApiResponse<TmuxHierarchy>> getHierarchy() async {
    final response = await _dio.get('/tmux/hierarchy');
    final json = response.data as Map<String, dynamic>;
    return ApiResponse<TmuxHierarchy>(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String? ?? '',
      data: json['data'] != null
          ? TmuxHierarchy.fromJson(json['data'] as Map<String, dynamic>)
          : null,
    );
  }

  Future<ApiResponse> testConnection() async {
    final response = await _dio.post('/settings/test-connection');
    return ApiResponse.fromJson(response.data as Map<String, dynamic>, null);
  }

  Future<ApiResponse> createSession(String sessionName) async {
    final response = await _dio.post('/tmux/create-session',
        queryParameters: {'session_name': sessionName});
    return ApiResponse.fromJson(response.data as Map<String, dynamic>, null);
  }

  Future<ApiResponse> deleteSession(String sessionName) async {
    final response = await _dio.delete(
        '/tmux/session/${Uri.encodeComponent(sessionName)}');
    return ApiResponse.fromJson(response.data as Map<String, dynamic>, null);
  }

  Future<ApiResponse> createWindow(String sessionName,
      {String? windowName}) async {
    final params = <String, dynamic>{'session_name': sessionName};
    if (windowName != null) {
      params['window_name'] = windowName;
    }
    final response =
        await _dio.post('/tmux/create-window', queryParameters: params);
    return ApiResponse.fromJson(response.data as Map<String, dynamic>, null);
  }

  Future<ApiResponse> deleteWindow(
      String sessionName, String windowIndex) async {
    final response = await _dio.delete(
        '/tmux/window/${Uri.encodeComponent(sessionName)}/${Uri.encodeComponent(windowIndex)}');
    return ApiResponse.fromJson(response.data as Map<String, dynamic>, null);
  }

  Future<ApiResponse> resizePane(String target, int cols, int rows) async {
    final response = await _dio.post('/tmux/resize', queryParameters: {
      'target': target,
      'cols': cols.toString(),
      'rows': rows.toString(),
    });
    return ApiResponse.fromJson(response.data as Map<String, dynamic>, null);
  }

  // --- File endpoints ---

  Future<ApiResponse<FileTreeResponse>> getFileTree(
      {String path = '/'}) async {
    final response =
        await _dio.get('/files/tree', queryParameters: {'path': path});
    final json = response.data as Map<String, dynamic>;
    return ApiResponse<FileTreeResponse>(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String? ?? '',
      data: json['data'] != null
          ? FileTreeResponse.fromJson(json['data'] as Map<String, dynamic>)
          : null,
    );
  }

  Future<ApiResponse<FileContentResponse>> getFileContent(String path) async {
    final response =
        await _dio.get('/files/content', queryParameters: {'path': path});
    final json = response.data as Map<String, dynamic>;
    return ApiResponse<FileContentResponse>(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String? ?? '',
      data: json['data'] != null
          ? FileContentResponse.fromJson(json['data'] as Map<String, dynamic>)
          : null,
    );
  }

  // --- Health check ---

  Future<bool> healthCheck() async {
    try {
      final healthUrl = _baseUrl.replaceAll('/api', '/health');
      final response = await Dio().get(healthUrl);
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Check health of an arbitrary base URL (e.g. "http://10.0.2.2:8000").
  ///
  /// Uses short timeouts so the dropdown can update quickly.
  static Future<bool> checkUrlHealth(String baseUrl) async {
    try {
      final normalized = baseUrl.replaceAll(RegExp(r'/+$'), '');
      final response = await Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
      )).get('$normalized/health');
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
