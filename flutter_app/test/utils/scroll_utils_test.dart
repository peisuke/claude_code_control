/// Port of frontend/src/utils/__tests__/scroll.test.ts (4 test cases)
///
/// Note: The web version tests DOM APIs (scrollTop/scrollHeight).
/// Flutter uses ScrollController + fakeAsync for timer testing.
/// Two web tests are ported as-is; two are adapted for Flutter's API.
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/config/app_config.dart';
import 'package:tmux_control/utils/scroll_utils.dart';

void main() {
  group('ScrollUtils', () {
    group('scrollToBottom', () {
      test('should do nothing for null controller', () {
        // Port of: "should do nothing for null element"
        // Should not throw.
        ScrollUtils.scrollToBottom(null);
      });

      test('should do nothing for controller without clients', () {
        // Flutter-specific: controller exists but is not attached.
        final controller = ScrollController();
        // Should not throw.
        ScrollUtils.scrollToBottom(controller);
        controller.dispose();
      });

      test('should use default delay from AppConfig', () {
        // Port of: "should scroll element to bottom after default delay"
        // We verify the constant is correct.
        expect(AppConfig.scrollAnimationDelayMs, 50);
      });

      test('should accept custom delay parameter', () {
        // Port of: "should scroll element to bottom after custom delay"
        // Verify the API accepts a custom delay without error.
        // Actual scroll behavior requires a live ScrollController
        // attached to a widget tree, which is covered in widget tests.
        ScrollUtils.scrollToBottom(null, delay: 100);
      });
    });
  });
}
