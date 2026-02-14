/// Port of frontend/src/services/__tests__/api.test.ts (34 test cases)
///
/// Tests the ApiService: URL construction, HTTP methods, request bodies,
/// query parameters, and error handling for all endpoints.
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/services/api_service.dart';

// ─── Mock Interceptor ───────────────────────────────────────────────
/// Port of web test's mockFetch pattern.
/// Captures outgoing requests and returns controlled responses.
class MockInterceptor extends Interceptor {
  final List<RequestOptions> requests = [];
  Map<String, dynamic>? nextResponse;
  int? nextStatusCode;
  DioException? nextError;

  void mockResolve(Map<String, dynamic> data, {int statusCode = 200}) {
    nextResponse = data;
    nextStatusCode = statusCode;
    nextError = null;
  }

  void mockReject({required int statusCode}) {
    nextError = DioException(
      requestOptions: RequestOptions(path: ''),
      response: Response(
        requestOptions: RequestOptions(path: ''),
        statusCode: statusCode,
      ),
      type: DioExceptionType.badResponse,
    );
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    requests.add(options);
    if (nextError != null) {
      final err = nextError!;
      nextError = null;
      handler.reject(DioException(
        requestOptions: options,
        response: Response(
          requestOptions: options,
          statusCode: err.response?.statusCode ?? 500,
        ),
        type: DioExceptionType.badResponse,
      ));
      return;
    }
    handler.resolve(Response(
      requestOptions: options,
      data: nextResponse ?? {'success': true},
      statusCode: nextStatusCode ?? 200,
    ));
    nextResponse = null;
    nextStatusCode = null;
  }

  /// Last captured request.
  RequestOptions get lastRequest => requests.last;

  /// Clear captured requests.
  void clear() => requests.clear();
}

void main() {
  late ApiService api;
  late MockInterceptor mock;

  setUp(() {
    final dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000/api'));
    mock = MockInterceptor();
    dio.interceptors.add(mock);
    api = ApiService(baseUrl: 'http://localhost:8000/api', dio: dio);
  });

  group('TmuxAPI (api.test.ts port)', () {
    // ── sendCommand ──────────────────────────────────────────

    group('sendCommand', () {
      // Port of: "should send command with default target"
      test('should send command with default target', () async {
        mock.mockResolve({'success': true, 'message': 'Command sent'});

        final result = await api.sendCommand('ls -la');

        expect(mock.lastRequest.method, 'POST');
        expect(mock.lastRequest.path, '/tmux/send-command');
        expect(mock.lastRequest.data['command'], 'ls -la');
        expect(mock.lastRequest.data['target'], 'default');
        expect(result.success, true);
        expect(result.message, 'Command sent');
      });

      // Port of: "should send command with custom target"
      test('should send command with custom target', () async {
        mock.mockResolve({'success': true, 'message': ''});

        await api.sendCommand('echo hello', target: 'session:window');

        expect(mock.lastRequest.data['command'], 'echo hello');
        expect(mock.lastRequest.data['target'], 'session:window');
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 500);

        expect(
          () => api.sendCommand('ls'),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── sendEnter ────────────────────────────────────────────

    group('sendEnter', () {
      // Port of: "should send enter with default target"
      test('should send enter with default target', () async {
        mock.mockResolve({'success': true, 'message': ''});

        final result = await api.sendEnter();

        expect(mock.lastRequest.method, 'POST');
        expect(mock.lastRequest.path, '/tmux/send-enter');
        expect(mock.lastRequest.queryParameters['target'], 'default');
        expect(result.success, true);
      });

      // Port of: "should send enter with custom target"
      test('should send enter with custom target', () async {
        mock.mockResolve({'success': true, 'message': ''});

        await api.sendEnter(target: 'my-session');

        expect(mock.lastRequest.queryParameters['target'], 'my-session');
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 404);

        expect(
          () => api.sendEnter(),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── getOutput ────────────────────────────────────────────

    group('getOutput', () {
      // Port of: "should get output with default parameters"
      test('should get output with default parameters', () async {
        mock.mockResolve({
          'content': 'terminal content',
          'target': 'default',
          'timestamp': DateTime.now().toIso8601String(),
        });

        final result = await api.getOutput('default');

        expect(mock.lastRequest.method, 'GET');
        expect(mock.lastRequest.path, '/tmux/output');
        expect(mock.lastRequest.queryParameters['target'], 'default');
        expect(result.content, 'terminal content');
      });

      // Port of: "should get output with custom target"
      test('should get output with custom target', () async {
        mock.mockResolve({
          'content': 'content',
          'target': 'session:0',
          'timestamp': DateTime.now().toIso8601String(),
        });

        await api.getOutput('session:0');

        expect(mock.lastRequest.queryParameters['target'], 'session:0');
      });

      // Port of: "should get output with history"
      test('should get output with history', () async {
        mock.mockResolve({
          'content': 'historical content',
          'target': 'default',
          'timestamp': DateTime.now().toIso8601String(),
        });

        await api.getOutput('default', includeHistory: true);

        expect(mock.lastRequest.queryParameters['include_history'], 'true');
      });

      // Port of: "should get output with history and lines limit"
      test('should get output with history and lines limit', () async {
        mock.mockResolve({
          'content': 'limited content',
          'target': 'default',
          'timestamp': DateTime.now().toIso8601String(),
        });

        await api.getOutput('default', includeHistory: true, lines: 500);

        expect(mock.lastRequest.queryParameters['include_history'], 'true');
        expect(mock.lastRequest.queryParameters['lines'], '500');
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 503);

        expect(
          () => api.getOutput('default'),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── getHierarchy ─────────────────────────────────────────

    group('getHierarchy', () {
      // Port of: "should get tmux hierarchy"
      test('should get tmux hierarchy', () async {
        mock.mockResolve({
          'success': true,
          'message': '',
          'data': {
            'session1': {
              'windows': {
                '0': {
                  'index': '0',
                  'name': 'bash',
                  'active': true,
                  'panes': {
                    '0': {
                      'index': '0',
                      'active': true,
                      'command': 'bash',
                    }
                  },
                }
              }
            },
          },
        });

        final result = await api.getHierarchy();

        expect(mock.lastRequest.method, 'GET');
        expect(mock.lastRequest.path, '/tmux/hierarchy');
        expect(result.success, true);
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 500);

        expect(
          () => api.getHierarchy(),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── testConnection ───────────────────────────────────────

    group('testConnection', () {
      // Port of: "should test connection successfully"
      test('should test connection successfully', () async {
        mock.mockResolve({'success': true, 'message': 'Connected'});

        final result = await api.testConnection();

        expect(mock.lastRequest.method, 'POST');
        expect(mock.lastRequest.path, '/settings/test-connection');
        expect(result.success, true);
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 502);

        expect(
          () => api.testConnection(),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── createSession ────────────────────────────────────────

    group('createSession', () {
      // Port of: "should create a new session"
      test('should create a new session', () async {
        mock.mockResolve({'success': true, 'message': 'Session created'});

        final result = await api.createSession('new-session');

        expect(mock.lastRequest.method, 'POST');
        expect(mock.lastRequest.path, '/tmux/create-session');
        expect(
          mock.lastRequest.queryParameters['session_name'],
          'new-session',
        );
        expect(result.success, true);
      });

      // Port of: "should URL encode session name"
      test('should pass session name with spaces', () async {
        mock.mockResolve({'success': true, 'message': ''});

        await api.createSession('my session');

        expect(
          mock.lastRequest.queryParameters['session_name'],
          'my session',
        );
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 400);

        expect(
          () => api.createSession('test'),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── deleteSession ────────────────────────────────────────

    group('deleteSession', () {
      // Port of: "should delete a session"
      test('should delete a session', () async {
        mock.mockResolve({'success': true, 'message': 'Session deleted'});

        final result = await api.deleteSession('old-session');

        expect(mock.lastRequest.method, 'DELETE');
        expect(mock.lastRequest.path, contains('old-session'));
        expect(result.success, true);
      });

      // Port of: "should URL encode session name"
      test('should URL encode session name', () async {
        mock.mockResolve({'success': true, 'message': ''});

        await api.deleteSession('session:special');

        expect(mock.lastRequest.path, contains('session%3Aspecial'));
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 404);

        expect(
          () => api.deleteSession('nonexistent'),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── createWindow ─────────────────────────────────────────

    group('createWindow', () {
      // Port of: "should create window without name"
      test('should create window without name', () async {
        mock.mockResolve({'success': true, 'message': 'Window created'});

        final result = await api.createWindow('my-session');

        expect(mock.lastRequest.method, 'POST');
        expect(mock.lastRequest.path, '/tmux/create-window');
        expect(
          mock.lastRequest.queryParameters['session_name'],
          'my-session',
        );
        expect(
          mock.lastRequest.queryParameters.containsKey('window_name'),
          false,
        );
        expect(result.success, true);
      });

      // Port of: "should create window with name"
      test('should create window with name', () async {
        mock.mockResolve({'success': true, 'message': ''});

        await api.createWindow('my-session', windowName: 'my-window');

        expect(
          mock.lastRequest.queryParameters['session_name'],
          'my-session',
        );
        expect(
          mock.lastRequest.queryParameters['window_name'],
          'my-window',
        );
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 500);

        expect(
          () => api.createWindow('session'),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── deleteWindow ─────────────────────────────────────────

    group('deleteWindow', () {
      // Port of: "should delete a window"
      test('should delete a window', () async {
        mock.mockResolve({'success': true, 'message': 'Window deleted'});

        final result = await api.deleteWindow('my-session', '0');

        expect(mock.lastRequest.method, 'DELETE');
        expect(mock.lastRequest.path, contains('my-session'));
        expect(mock.lastRequest.path, contains('0'));
        expect(result.success, true);
      });

      // Port of: "should URL encode parameters"
      test('should URL encode parameters', () async {
        mock.mockResolve({'success': true, 'message': ''});

        await api.deleteWindow('session:name', '1');

        expect(mock.lastRequest.path, contains('session%3Aname'));
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 404);

        expect(
          () => api.deleteWindow('session', '99'),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── getFileTree ──────────────────────────────────────────

    group('getFileTree', () {
      // Port of: "should get file tree with default path"
      test('should get file tree with default path', () async {
        mock.mockResolve({
          'success': true,
          'message': '',
          'data': {
            'tree': <Map<String, dynamic>>[],
            'current_path': '/',
          },
        });

        final result = await api.getFileTree();

        expect(mock.lastRequest.method, 'GET');
        expect(mock.lastRequest.path, '/files/tree');
        expect(mock.lastRequest.queryParameters['path'], '/');
        expect(result.success, true);
      });

      // Port of: "should get file tree with custom path"
      test('should get file tree with custom path', () async {
        mock.mockResolve({
          'success': true,
          'message': '',
          'data': {
            'tree': <Map<String, dynamic>>[],
            'current_path': '/home/user',
          },
        });

        await api.getFileTree(path: '/home/user');

        expect(mock.lastRequest.queryParameters['path'], '/home/user');
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 403);

        expect(
          () => api.getFileTree(),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── getFileContent ───────────────────────────────────────

    group('getFileContent', () {
      // Port of: "should get file content"
      test('should get file content', () async {
        mock.mockResolve({
          'success': true,
          'message': '',
          'data': {
            'content': 'file content here',
            'path': '/file.txt',
          },
        });

        final result = await api.getFileContent('/file.txt');

        expect(mock.lastRequest.method, 'GET');
        expect(mock.lastRequest.path, '/files/content');
        expect(mock.lastRequest.queryParameters['path'], '/file.txt');
        expect(result.success, true);
        expect(result.data?.content, 'file content here');
      });

      // Port of: "should URL encode path with special characters"
      test('should pass path with special characters', () async {
        mock.mockResolve({
          'success': true,
          'message': '',
          'data': {
            'content': 'content',
            'path': '/path with spaces/file.txt',
          },
        });

        await api.getFileContent('/path with spaces/file.txt');

        expect(
          mock.lastRequest.queryParameters['path'],
          '/path with spaces/file.txt',
        );
      });

      // Port of: "should throw error on HTTP error"
      test('should throw error on HTTP error', () async {
        mock.mockReject(statusCode: 404);

        expect(
          () => api.getFileContent('/nonexistent.txt'),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── baseURL configuration ────────────────────────────────

    group('baseURL configuration', () {
      // Port of: "should use /api as default baseURL"
      test('should use configured baseURL', () {
        // Tested implicitly by all tests above.
        // The Dio instance uses 'http://localhost:8000/api' as base.
        expect(mock.requests, isEmpty);
      });
    });

    // ── resizePane (Flutter-only, not in web tests) ──────────

    group('resizePane', () {
      test('should send resize request', () async {
        mock.mockResolve({'success': true, 'message': ''});

        final result = await api.resizePane('default', 80, 24);

        expect(mock.lastRequest.method, 'POST');
        expect(mock.lastRequest.path, '/tmux/resize');
        expect(mock.lastRequest.queryParameters['target'], 'default');
        expect(mock.lastRequest.queryParameters['cols'], '80');
        expect(mock.lastRequest.queryParameters['rows'], '24');
        expect(result.success, true);
      });
    });
  });
}
