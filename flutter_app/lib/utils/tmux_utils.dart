/// Utility functions for tmux command handling.
/// Port of frontend/src/utils/tmux.ts
class TmuxTarget {
  final String session;
  final String? window;
  final String? pane;

  const TmuxTarget({required this.session, this.window, this.pane});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TmuxTarget &&
          session == other.session &&
          window == other.window &&
          pane == other.pane;

  @override
  int get hashCode => Object.hash(session, window, pane);

  @override
  String toString() => 'TmuxTarget(session: $session, window: $window, pane: $pane)';
}

class TmuxUtils {
  TmuxUtils._();

  /// Validate if command is not empty after trimming.
  static bool isValidCommand(String command) {
    return command.trim().isNotEmpty;
  }

  /// Parse tmux target format (session:window.pane).
  static TmuxTarget parseTarget(String target, [String defaultSession = '']) {
    final parts = target.split(':');
    final session = parts[0].isEmpty ? defaultSession : parts[0];

    if (parts.length == 1) {
      return TmuxTarget(session: session);
    }

    final windowPane = parts.length > 1 ? parts[1] : '';
    final windowParts = windowPane.split('.');
    final window = windowParts[0].isEmpty ? null : windowParts[0];
    final pane = windowParts.length > 1 && windowParts[1].isNotEmpty
        ? windowParts[1]
        : null;

    return TmuxTarget(session: session, window: window, pane: pane);
  }

  /// Build tmux target string.
  static String buildTarget(String session, [String? window, String? pane]) {
    var target = session;
    if (window != null && window.isNotEmpty) {
      target += ':$window';
      if (pane != null && pane.isNotEmpty) {
        target += '.$pane';
      }
    }
    return target;
  }

  /// Sanitize command for safe execution.
  static String sanitizeCommand(String command) {
    return command.trim();
  }
}
