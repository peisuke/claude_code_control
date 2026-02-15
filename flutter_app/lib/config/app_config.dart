/// Application configuration constants.
///
/// Backend URL can be overridden via --dart-define=BACKEND_URL=http://host:port
/// or at runtime via SharedPreferences (loaded in main.dart before runApp).
class AppConfig {
  AppConfig._();

  static const String _compileTimeUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'http://10.0.2.2:8000',
  );

  /// Runtime override — set from SharedPreferences in main.dart.
  static String? _savedBackendUrl;

  /// Call from main() before runApp() to apply the saved URL.
  static void setSavedBackendUrl(String? url) {
    _savedBackendUrl = url;
  }

  /// The effective backend URL: saved URL if available, otherwise compile-time.
  static String get backendUrl => _savedBackendUrl ?? _compileTimeUrl;

  /// Strip trailing slash(es) to avoid double-slash in URL paths.
  static String get _normalizedUrl {
    final url = backendUrl;
    return url.endsWith('/') ? url.replaceAll(RegExp(r'/+$'), '') : url;
  }

  static String get apiBaseUrl => '$_normalizedUrl/api';
  static String get wsBaseUrl {
    final uri = Uri.parse(_normalizedUrl);
    final wsScheme = uri.scheme == 'https' ? 'wss' : 'ws';
    return '${uri.replace(scheme: wsScheme)}/api/tmux/ws';
  }

  // Timing constants (matching frontend/src/constants/ui.ts)
  static const int commandRefreshDelayMs = 500;
  static const int appResumeReconnectDelayMs = 1500;
  static const int scrollAnimationDelayMs = 50;
  static const double refreshIntervalFast = 0.1;
  static const double refreshIntervalNormal = 2;

  // WebSocket
  static const int heartbeatIntervalMs = 10000;
  static const int connectionCheckIntervalMs = 5000;
  static const int heartbeatTimeoutMs = 25000;

  // Scroll
  static const double scrollThreshold = 50.0;
  static const double bottomThreshold = 50.0;
  static const int historyLinesPerLoad = 500;

  // Terminal resize
  static const double charWidthRatio = 0.6;
  static const double lineHeightRatio = 1.2;
  static const double terminalPadding = 16.0;
  static const int minCols = 20;
  static const int minRows = 24;
  static const int resizeDebounceMs = 300;

  // Terminal font sizes (pixels)
  static const double fontSizeSmall = 10.0;
  static const double fontSizeMedium = 12.0;
  static const double fontSizeLarge = 14.0;

  // Choice detection
  static const int choiceTailLines = 20;

  // Layout
  static const int commandInputMinLines = 3;

  // Shared preferences keys
  static const String keySelectedTarget = 'tmux-selected-target';
  static const String keyViewMode = 'tmux-view-mode';
  static const String keyDarkMode = 'tmux-dark-mode';
  static const String keyBackendUrl = 'tmux-backend-url';
  static const String keyBackendUrls = 'tmux-backend-urls'; // List<String>
}
