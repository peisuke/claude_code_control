/// Scroll utilities for terminal output.
/// Port of frontend/src/utils/scroll.ts
///
/// Note: The web version uses DOM APIs (scrollTop, scrollHeight).
/// Flutter uses ScrollController which has different APIs, so
/// this is an adaptation rather than direct port.
import 'dart:async';
import 'package:flutter/widgets.dart';
import '../config/app_config.dart';

class ScrollUtils {
  ScrollUtils._();

  /// Scroll a [ScrollController] to bottom after [delay] ms.
  /// Port of ScrollUtils.scrollToBottom(element, delay).
  ///
  /// Web: element.scrollTop = element.scrollHeight after setTimeout(delay).
  /// Flutter: controller.jumpTo(maxScrollExtent) after Future.delayed.
  static void scrollToBottom(
    ScrollController? controller, {
    int delay = AppConfig.scrollAnimationDelayMs,
  }) {
    if (controller == null || !controller.hasClients) return;

    Timer(Duration(milliseconds: delay), () {
      if (!controller.hasClients) return;
      controller.jumpTo(controller.position.maxScrollExtent);
    });
  }
}
