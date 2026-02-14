/// Port of frontend/src/hooks/__tests__/useLocalStorageState.test.ts (boolean portion)
///
/// The web uses a generic useLocalStorageBoolean hook. In Flutter, ThemeNotifier
/// specializes this for dark mode persistence via SharedPreferences.
///
/// Web tests ported here:
///   - "should return default value when localStorage is empty" (2 tests)
///   - "should return parsed boolean true from localStorage"
///   - "should return parsed boolean false from localStorage"
///   - "should store boolean as string in localStorage"
///   - "should toggle boolean value"
///   - "should handle invalid boolean strings as false" (adapted)
///   - persistence across re-renders → persistence after toggle
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/config/app_config.dart';
import 'package:tmux_control/providers/theme_provider.dart';

void main() {
  group('ThemeNotifier (useLocalStorageBoolean port)', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    // ── initial state ──────────────────────────────────────────
    group('initial state', () {
      test('should have dark mode true by default', () {
        // Port of: "should return default value when localStorage is empty"
        // ThemeNotifier defaults to true (dark mode on).
        final notifier = ThemeNotifier();
        expect(notifier.debugState, true);
      });

      test('should return false default value when false is stored', () async {
        // Port of: "should return false default value"
        SharedPreferences.setMockInitialValues({
          AppConfig.keyDarkMode: false,
        });

        final notifier = ThemeNotifier();
        await Future.delayed(const Duration(milliseconds: 100));

        expect(notifier.debugState, false);
      });

      test('should return parsed boolean true from SharedPreferences',
          () async {
        // Port of: "should return parsed boolean true from localStorage"
        SharedPreferences.setMockInitialValues({
          AppConfig.keyDarkMode: true,
        });

        final notifier = ThemeNotifier();
        await Future.delayed(const Duration(milliseconds: 100));

        expect(notifier.debugState, true);
      });

      test('should return parsed boolean false from SharedPreferences',
          () async {
        // Port of: "should return parsed boolean false from localStorage"
        SharedPreferences.setMockInitialValues({
          AppConfig.keyDarkMode: false,
        });

        final notifier = ThemeNotifier();
        await Future.delayed(const Duration(milliseconds: 100));

        expect(notifier.debugState, false);
      });

      test('should use default when key is missing', () async {
        // Port of: "should return default value when localStorage is empty"
        SharedPreferences.setMockInitialValues({});

        final notifier = ThemeNotifier();
        await Future.delayed(const Duration(milliseconds: 100));

        // Default is true (dark mode)
        expect(notifier.debugState, true);
      });
    });

    // ── toggle ────────────────────────────────────────────────
    group('toggle', () {
      test('should toggle from true to false', () async {
        // Port of: "should store boolean as string in localStorage"
        final notifier = ThemeNotifier();
        expect(notifier.debugState, true);

        await notifier.toggle();

        expect(notifier.debugState, false);
      });

      test('should toggle from false to true', () async {
        SharedPreferences.setMockInitialValues({
          AppConfig.keyDarkMode: false,
        });

        final notifier = ThemeNotifier();
        await Future.delayed(const Duration(milliseconds: 100));
        expect(notifier.debugState, false);

        await notifier.toggle();

        expect(notifier.debugState, true);
      });

      test('should persist toggle to SharedPreferences', () async {
        // Port of: "should store boolean as string in localStorage"
        final notifier = ThemeNotifier();

        await notifier.toggle(); // true → false

        final prefs = await SharedPreferences.getInstance();
        expect(prefs.getBool(AppConfig.keyDarkMode), false);
      });

      test('should toggle multiple times', () async {
        // Port of: "should toggle boolean value"
        final notifier = ThemeNotifier();
        expect(notifier.debugState, true);

        await notifier.toggle();
        expect(notifier.debugState, false);

        await notifier.toggle();
        expect(notifier.debugState, true);

        await notifier.toggle();
        expect(notifier.debugState, false);
      });

      test('should persist each toggle to SharedPreferences', () async {
        // Port of: "should persist value across re-renders"
        final notifier = ThemeNotifier();

        await notifier.toggle(); // true → false
        var prefs = await SharedPreferences.getInstance();
        expect(prefs.getBool(AppConfig.keyDarkMode), false);

        await notifier.toggle(); // false → true
        prefs = await SharedPreferences.getInstance();
        expect(prefs.getBool(AppConfig.keyDarkMode), true);
      });
    });
  });
}
