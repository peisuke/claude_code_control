/// Port of frontend/src/contexts/__tests__/ThemeContext.test.tsx
///
/// Tests for theme application at the widget level.
/// Web tests: ThemeProvider (5), useThemeContext (2), theme creation (2),
///            context value memoization (1).
///
/// Flutter adaptation:
///   - ThemeProvider → Riverpod themeProvider + TmuxControlApp.
///   - useThemeContext → ref.watch(themeProvider).
///   - Theme creation → MaterialApp themeMode (dark/light).
///   - Context memoization → handled natively by Riverpod.
///   - "throw outside provider" → not applicable (Riverpod scope).
///   - Provider-level tests already in theme_provider_test.dart (10 tests).
///   - This file tests widget-level theme integration only.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/app.dart';
import 'package:tmux_control/config/app_config.dart';
import 'package:tmux_control/providers/connection_provider.dart';
import 'package:tmux_control/providers/theme_provider.dart';
import 'package:tmux_control/providers/websocket_provider.dart';
import 'package:tmux_control/screens/home_screen.dart';
import 'package:tmux_control/services/api_service.dart';
import 'package:tmux_control/services/websocket_service.dart';

import '../helpers/widget_test_helpers.dart';

Widget _buildApp({Map<String, Object>? prefs}) {
  SharedPreferences.setMockInitialValues(prefs ?? {});

  final mockApi = NoOpApiService();
  return ProviderScope(
    overrides: [
      apiServiceProvider.overrideWithValue(mockApi),
      connectionProvider.overrideWith((ref) => ConnectionNotifier(mockApi)),
      wsConnectionStateProvider.overrideWith(
          (ref) => Stream.value(WsConnectionState.connected)),
      websocketServiceProvider.overrideWith((ref) {
        final service = NoOpWebSocketService();
        ref.onDispose(service.dispose);
        return service;
      }),
    ],
    child: const TmuxControlApp(),
  );
}

void main() {
  setUp(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('Theme (ThemeContext.test.tsx port)', () {
    // ── ThemeProvider ──────────────────────────────────────
    group('ThemeProvider', () {
      testWidgets('should render children', (tester) async {
        // Port of: "should render children"
        await tester.pumpWidget(_buildApp());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        expect(find.byType(HomeScreen), findsOneWidget);
      });

      testWidgets('should provide dark mode by default', (tester) async {
        // Port of: "should provide darkMode value from localStorage"
        // Flutter default: dark mode = true (opposite of web default)
        await tester.pumpWidget(_buildApp());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        final materialApp =
            tester.widget<MaterialApp>(find.byType(MaterialApp));
        expect(materialApp.themeMode, ThemeMode.dark);
      });
    });

    // ── theme creation ──────────────────────────────────────
    group('theme creation', () {
      testWidgets('should create dark theme when darkMode is true',
          (tester) async {
        // Port of: "should create dark theme when darkMode is true"
        await tester
            .pumpWidget(_buildApp(prefs: {AppConfig.keyDarkMode: true}));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        final materialApp =
            tester.widget<MaterialApp>(find.byType(MaterialApp));
        expect(materialApp.themeMode, ThemeMode.dark);
      });

      testWidgets('should create light theme when darkMode is false',
          (tester) async {
        // Port of: "should create light theme when darkMode is false"
        await tester
            .pumpWidget(_buildApp(prefs: {AppConfig.keyDarkMode: false}));
        await tester.pump();
        await tester.pump();
        await tester.pump();

        final materialApp =
            tester.widget<MaterialApp>(find.byType(MaterialApp));
        expect(materialApp.themeMode, ThemeMode.light);
      });

      testWidgets('should use correct SharedPreferences key',
          (tester) async {
        // Port of: "should use correct localStorage key"
        // Verify AppConfig.keyDarkMode is used
        expect(AppConfig.keyDarkMode, 'tmux-dark-mode');
      });
    });

    // ── toggle ──────────────────────────────────────────────
    group('toggle', () {
      testWidgets('should switch theme on toggle', (tester) async {
        // Port of: "should provide setDarkMode function"
        await tester.pumpWidget(_buildApp());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        // Starts dark
        var materialApp =
            tester.widget<MaterialApp>(find.byType(MaterialApp));
        expect(materialApp.themeMode, ThemeMode.dark);

        // Find the ProviderScope and toggle theme
        final container = ProviderScope.containerOf(
            tester.element(find.byType(TmuxControlApp)));
        await container.read(themeProvider.notifier).toggle();
        await tester.pump();
        await tester.pump();

        // Should now be light
        materialApp =
            tester.widget<MaterialApp>(find.byType(MaterialApp));
        expect(materialApp.themeMode, ThemeMode.light);
      });

      testWidgets('should use Material 3', (tester) async {
        // Verify theme uses Material 3
        await tester.pumpWidget(_buildApp());
        await tester.pump();
        await tester.pump();
        await tester.pump();

        final materialApp =
            tester.widget<MaterialApp>(find.byType(MaterialApp));
        // Both light and dark themes should use Material 3
        expect(materialApp.theme?.useMaterial3, isTrue);
        expect(materialApp.darkTheme?.useMaterial3, isTrue);
      });
    });
  });
}
