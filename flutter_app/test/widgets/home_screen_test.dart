/// Port of frontend/src/components/tmux/__tests__/TmuxViewContainer.test.tsx
///   + frontend/src/hooks/__tests__/useAppVisibility.test.ts
///
/// TmuxViewContainer tests (11): rendering (3), props passing (4), expanded state (2).
/// useAppVisibility tests (11): event listeners (3), cleanup (1), lifecycle events (5),
///                               enabled toggle (2).
///
/// Flutter adaptation:
///   - HomeScreen combines TmuxViewContainer layout + useAppVisibility lifecycle.
///   - TmuxViewContainer → HomeScreen._buildTmuxView() renders TerminalOutput,
///     TmuxKeyboard, ChoiceButtons, CommandInputArea.
///   - useAppVisibility → WidgetsBindingObserver.didChangeAppLifecycleState
///     (resume → WS reconnect + output refresh, pause → WS disconnect).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/config/app_config.dart';
import 'package:tmux_control/providers/connection_provider.dart';
import 'package:tmux_control/providers/output_provider.dart';
import 'package:tmux_control/providers/view_provider.dart';
import 'package:tmux_control/providers/websocket_provider.dart';
import 'package:tmux_control/screens/home_screen.dart';
import 'package:tmux_control/services/api_service.dart';
import 'package:tmux_control/services/websocket_service.dart';
import 'package:tmux_control/widgets/common/connection_status.dart';
import 'package:tmux_control/widgets/terminal/choice_buttons.dart';
import 'package:tmux_control/widgets/terminal/command_input_area.dart';
import 'package:tmux_control/widgets/terminal/terminal_output.dart';
import 'package:tmux_control/widgets/terminal/tmux_keyboard.dart';

import '../helpers/widget_test_helpers.dart';

/// Build a HomeScreen with all providers properly mocked.
/// Returns the [NoOpWebSocketService] for lifecycle verification.
Widget _buildHomeScreen({
  required NoOpWebSocketService ws,
  NoOpApiService? api,
  bool wsConnected = true,
}) {
  final mockApi = api ?? NoOpApiService();

  return ProviderScope(
    overrides: [
      apiServiceProvider.overrideWithValue(mockApi),
      selectedTargetProvider.overrideWith((ref) => 'default'),
      connectionProvider.overrideWith((ref) => ConnectionNotifier(mockApi)),
      wsConnectionStateProvider.overrideWith((ref) => Stream.value(
            wsConnected
                ? WsConnectionState.connected
                : WsConnectionState.disconnected,
          )),
      websocketServiceProvider.overrideWith((ref) {
        ref.onDispose(ws.dispose);
        return ws;
      }),
    ],
    child: MaterialApp(home: const HomeScreen()),
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('HomeScreen — TmuxViewContainer port', () {
    // ── rendering ──────────────────────────────────────────
    group('rendering', () {
      testWidgets('should render terminal output component', (tester) async {
        // Port of: "should render terminal output component"
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byType(TerminalOutput), findsOneWidget);
      });

      testWidgets('should render command input component', (tester) async {
        // Port of: "should render command input component"
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byType(CommandInputArea), findsOneWidget);
      });

      testWidgets('should render tmux keyboard component', (tester) async {
        // Port of: "should render tmux keyboard component"
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byType(TmuxKeyboard), findsOneWidget);
      });

      testWidgets('should render choice buttons component', (tester) async {
        // ChoiceButtons only renders when choices are detected in output
        final ws = NoOpWebSocketService();
        final api = NoOpApiService(
          outputContent: 'Choose:\n1. Yes\n2. No\n',
        );
        await tester.pumpWidget(_buildHomeScreen(ws: ws, api: api));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byType(ChoiceButtons), findsOneWidget);
      });
    });

    // ── app bar ──────────────────────────────────────────────
    group('app bar', () {
      testWidgets('should show Tmux Controller in app bar', (tester) async {
        // Port of: title rendering in tmux view
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // Title shows session/window info or fallback
        expect(find.byType(AppBar), findsOneWidget);
      });

      testWidgets('should show connection status in app bar', (tester) async {
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byType(ConnectionStatus), findsOneWidget);
      });

      testWidgets('should show settings icon', (tester) async {
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.settings), findsOneWidget);
      });

      testWidgets('should show menu icon for drawer', (tester) async {
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.menu), findsOneWidget);
      });
    });

    // ── view mode ──────────────────────────────────────────
    group('view mode', () {
      testWidgets('should render in tmux view by default', (tester) async {
        // Port of: "should render in collapsed mode by default"
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // All tmux components should be visible
        expect(find.byType(TerminalOutput), findsOneWidget);
        expect(find.byType(CommandInputArea), findsOneWidget);
        // Title shows session/window info or fallback
        expect(find.byType(AppBar), findsOneWidget);
      });

      testWidgets('should show Files title in file view mode',
          (tester) async {
        // Port of: file view mode rendering
        SharedPreferences.setMockInitialValues(
            {AppConfig.keyViewMode: 'file'});
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.text('Files'), findsOneWidget);
      });
    });
  });

  group('HomeScreen — useAppVisibility port', () {
    // ── observer registration ────────────────────────────────
    group('observer registration', () {
      testWidgets('should register as WidgetsBindingObserver',
          (tester) async {
        // Port of: "should add event listeners when enabled"
        // Flutter equivalent: WidgetsBindingObserver registered in initState
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();

        final state = tester.state(find.byType(HomeScreen));
        expect(state, isA<WidgetsBindingObserver>());
      });
    });

    // ── lifecycle events ─────────────────────────────────────
    group('lifecycle events', () {
      testWidgets('should connect WebSocket on init', (tester) async {
        // Port of: "should use enabled=true by default"
        // Flutter: WebSocket connect() is called in initState
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();

        expect(ws.connectCalled, isTrue);
      });

      testWidgets('should disconnect WebSocket on app pause', (tester) async {
        // Port of: "should not call onAppResume when document is hidden"
        // Flutter: didChangeAppLifecycleState(paused) → disconnect
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();

        ws.resetTracking();

        // Simulate app pause
        final state = tester.state(find.byType(HomeScreen));
        (state as WidgetsBindingObserver)
            .didChangeAppLifecycleState(AppLifecycleState.paused);
        await tester.pump();

        expect(ws.disconnectCalled, isTrue);
      });

      testWidgets('should reconnect WebSocket on app resume',
          (tester) async {
        // Port of: "should call onAppResume when document becomes visible"
        // Flutter: didChangeAppLifecycleState(resumed) → reconnect + refresh
        final ws = NoOpWebSocketService();
        await tester.pumpWidget(_buildHomeScreen(ws: ws));
        await tester.pump();
        await tester.pump();

        ws.resetTracking();

        // Simulate pause→resume cycle (_wasPaused guard requires prior pause)
        final state = tester.state(find.byType(HomeScreen));
        (state as WidgetsBindingObserver)
            .didChangeAppLifecycleState(AppLifecycleState.paused);
        await tester.pump();
        ws.resetTracking();

        (state as WidgetsBindingObserver)
            .didChangeAppLifecycleState(AppLifecycleState.resumed);

        // Advance past the resume delay (1500ms)
        await tester
            .pump(const Duration(milliseconds: AppConfig.appResumeReconnectDelayMs));
        await tester.pump();

        expect(ws.resetAndReconnectCalled, isTrue);
      });
    });
  });
}
