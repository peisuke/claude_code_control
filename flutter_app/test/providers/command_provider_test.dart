/// Port of frontend/src/hooks/__tests__/useCommandState.test.ts (18 test cases)
///
/// In Flutter, CommandNotifier combines the command state and handlers.
/// Some web tests (setCommand, commandExpanded) are handled at the widget
/// level in Flutter, so we test the notifier's core methods directly.
import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/models/api_response.dart';
import 'package:tmux_control/models/tmux_output.dart';
import 'package:tmux_control/providers/command_provider.dart';
import 'package:tmux_control/providers/output_provider.dart';
import 'package:tmux_control/services/api_service.dart';

// ─── Mock ApiService ──────────────────────────────────────────────
class MockApiService extends ApiService {
  final List<_SendCommandCall> sendCommandCalls = [];
  final List<String> sendEnterCalls = [];

  /// If non-null, sendCommand will throw this.
  Exception? sendCommandError;

  /// If non-null, sendEnter will throw this.
  Exception? sendEnterError;

  MockApiService() : super(baseUrl: 'http://localhost:0/api');

  @override
  Future<ApiResponse> sendCommand(String command,
      {required String target}) async {
    sendCommandCalls.add(_SendCommandCall(command, target));
    if (sendCommandError != null) {
      final err = sendCommandError!;
      sendCommandError = null;
      throw err;
    }
    return const ApiResponse(success: true, message: '');
  }

  @override
  Future<ApiResponse> sendEnter({required String target}) async {
    sendEnterCalls.add(target);
    if (sendEnterError != null) {
      final err = sendEnterError!;
      sendEnterError = null;
      throw err;
    }
    return const ApiResponse(success: true, message: '');
  }

  @override
  Future<TmuxOutput> getOutput(
    String target, {
    bool includeHistory = false,
    int? lines,
  }) async {
    return TmuxOutput(content: '', timestamp: '', target: target);
  }

  void clearCalls() {
    sendCommandCalls.clear();
    sendEnterCalls.clear();
  }
}

class _SendCommandCall {
  final String command;
  final String target;
  _SendCommandCall(this.command, this.target);
}

void main() {
  late MockApiService mockApi;
  late OutputNotifier outputNotifier;

  setUp(() {
    mockApi = MockApiService();
    outputNotifier = OutputNotifier(mockApi, 'default');
  });

  group('CommandNotifier (useCommandState port)', () {
    // ── initial state ──────────────────────────────────────────
    group('initial state', () {
      test('should have isLoading false initially', () {
        // Port of: "should have empty command initially" +
        //          "should have commandExpanded as false initially"
        // In Flutter, command text is stored in widget state (TextField).
        // CommandNotifier only manages isLoading and error.
        final notifier = CommandNotifier(mockApi, 'default', outputNotifier);
        expect(notifier.debugState.isLoading, false);
        expect(notifier.debugState.error, isNull);
      });
    });

    // ── sendCommand ──────────────────────────────────────────
    group('sendCommand (handleSendCommand)', () {
      test('should call API with command and target', () async {
        // Port of: "should call sendCommand with sanitized command and target"
        final notifier =
            CommandNotifier(mockApi, 'my-session', outputNotifier);

        await notifier.sendCommand('echo hello');

        expect(mockApi.sendCommandCalls.length, 1);
        expect(mockApi.sendCommandCalls[0].command, 'echo hello');
        expect(mockApi.sendCommandCalls[0].target, 'my-session');
      });

      test('should set isLoading during send', () async {
        final notifier = CommandNotifier(mockApi, 'default', outputNotifier);

        final states = <bool>[];
        notifier.addListener((state) {
          states.add(state.isLoading);
        });

        await notifier.sendCommand('ls');

        // Should have set isLoading true then false
        expect(states.contains(true), isTrue);
        expect(states.last, false);
      });

      test('should handle error and set error state', () async {
        // Port of: "should handle error silently and not clear command"
        mockApi.sendCommandError = Exception('Send failed');

        final notifier = CommandNotifier(mockApi, 'default', outputNotifier);

        await notifier.sendCommand('error command');

        expect(notifier.debugState.isLoading, false);
        expect(notifier.debugState.error, isNotNull);
      });
    });

    // ── sendEnter ────────────────────────────────────────────
    group('sendEnter (handleSendEnter)', () {
      test('should call API with target', () async {
        // Port of: "should call sendEnter with target"
        final notifier =
            CommandNotifier(mockApi, 'my-session:0', outputNotifier);

        await notifier.sendEnter();

        expect(mockApi.sendEnterCalls.length, 1);
        expect(mockApi.sendEnterCalls[0], 'my-session:0');
      });

      test('should handle error silently', () async {
        // Port of: "should handle error silently"
        mockApi.sendEnterError = Exception('Enter failed');

        final notifier = CommandNotifier(mockApi, 'default', outputNotifier);

        // Should not throw
        await notifier.sendEnter();

        expect(mockApi.sendEnterCalls.length, 1);
      });
    });

    // ── sendSpecialKey (handleKeyboardCommand) ────────────────
    group('sendSpecialKey (handleKeyboardCommand)', () {
      test('should call API with key command and target', () async {
        // Port of: "should call sendCommand with key command and target"
        final notifier =
            CommandNotifier(mockApi, 'session:1', outputNotifier);

        await notifier.sendSpecialKey('\x03'); // Ctrl+C

        expect(mockApi.sendCommandCalls.length, 1);
        expect(mockApi.sendCommandCalls[0].command, '\x03');
        expect(mockApi.sendCommandCalls[0].target, 'session:1');
      });

      test('should handle various keyboard commands', () async {
        // Port of: "should handle various keyboard commands"
        final notifier = CommandNotifier(mockApi, 'default', outputNotifier);

        final commands = ['\x03', '\x1b', '\x0c', '\x0f', '\x1b[A'];
        for (final cmd in commands) {
          await notifier.sendSpecialKey(cmd);
        }

        expect(mockApi.sendCommandCalls.length, commands.length);
      });

      test('should handle error and set error state', () async {
        // Port of: "should handle error silently"
        mockApi.sendCommandError = Exception('Keyboard command failed');

        final notifier = CommandNotifier(mockApi, 'default', outputNotifier);

        await notifier.sendSpecialKey('\x03');

        expect(notifier.debugState.error, isNotNull);
        expect(mockApi.sendCommandCalls.length, 1);
      });
    });

    // ── target ────────────────────────────────────────────────
    group('target', () {
      test('should use correct target when sending command', () async {
        // Port of: "should use updated target when sending command"
        // In Flutter, a new CommandNotifier is created when target changes.
        final notifier1 =
            CommandNotifier(mockApi, 'session1', outputNotifier);
        await notifier1.sendCommand('test');

        expect(mockApi.sendCommandCalls.last.target, 'session1');

        final notifier2 =
            CommandNotifier(mockApi, 'session2', outputNotifier);
        await notifier2.sendCommand('test2');

        expect(mockApi.sendCommandCalls.last.target, 'session2');
      });
    });
  });
}
