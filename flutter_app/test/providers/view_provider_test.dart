/// Port of frontend/src/hooks/__tests__/useViewState.test.ts (7 test cases)
///
/// In Flutter, ViewNotifier uses SharedPreferences for persistence.
/// Tests use SharedPreferences.setMockInitialValues for isolation.
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tmux_control/config/app_config.dart';
import 'package:tmux_control/providers/view_provider.dart';

void main() {
  group('ViewNotifier (useViewState port)', () {
    setUp(() {
      // Reset SharedPreferences for each test.
      SharedPreferences.setMockInitialValues({});
    });

    // ── initial state ──────────────────────────────────────────
    group('initial state', () {
      test('should have viewMode tmux by default', () {
        // Port of: "should have viewMode from localStorage"
        // Default value in Flutter is ViewMode.tmux (matches VIEW_MODES.TMUX).
        final notifier = ViewNotifier();
        expect(notifier.debugState, ViewMode.tmux);
      });

      test('should use correct storage key', () async {
        // Port of: "should use correct localStorage key"
        SharedPreferences.setMockInitialValues({
          AppConfig.keyViewMode: 'file',
        });

        final notifier = ViewNotifier();
        // Wait for async _load to complete.
        await Future.delayed(const Duration(milliseconds: 100));

        expect(notifier.debugState, ViewMode.file);
      });
    });

    // ── setMode (handleViewModeToggle) ─────────────────────
    group('setMode', () {
      test('should set mode to file', () async {
        // Port of: "should toggle from TMUX to FILE"
        final notifier = ViewNotifier();

        await notifier.setMode(ViewMode.file);

        expect(notifier.debugState, ViewMode.file);
      });

      test('should set mode to tmux', () async {
        // Port of: "should toggle from FILE to TMUX"
        final notifier = ViewNotifier();
        await notifier.setMode(ViewMode.file);
        expect(notifier.debugState, ViewMode.file);

        await notifier.setMode(ViewMode.tmux);
        expect(notifier.debugState, ViewMode.tmux);
      });

      test('should persist mode to SharedPreferences', () async {
        // Port of: "should start with FILE mode if stored"
        final notifier = ViewNotifier();
        await notifier.setMode(ViewMode.file);

        final prefs = await SharedPreferences.getInstance();
        expect(prefs.getString(AppConfig.keyViewMode), 'file');
      });
    });

    // ── persistence ──────────────────────────────────────────
    group('persistence', () {
      test('should restore file mode from storage', () async {
        // Port of: "should start with FILE mode if stored"
        SharedPreferences.setMockInitialValues({
          AppConfig.keyViewMode: 'file',
        });

        final notifier = ViewNotifier();
        await Future.delayed(const Duration(milliseconds: 100));

        expect(notifier.debugState, ViewMode.file);
      });
    });
  });
}
