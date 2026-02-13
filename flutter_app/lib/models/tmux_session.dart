class TmuxPane {
  final String index;
  final bool active;
  final String command;
  final String? size;

  const TmuxPane({
    required this.index,
    required this.active,
    required this.command,
    this.size,
  });

  factory TmuxPane.fromJson(Map<String, dynamic> json) {
    return TmuxPane(
      index: json['index']?.toString() ?? '0',
      active: json['active'] as bool? ?? false,
      command: json['command'] as String? ?? '',
      size: json['size'] as String?,
    );
  }
}

class TmuxWindow {
  final String index;
  final String name;
  final bool active;
  final int? paneCount;
  final Map<String, TmuxPane> panes;

  const TmuxWindow({
    required this.index,
    required this.name,
    required this.active,
    this.paneCount,
    required this.panes,
  });

  factory TmuxWindow.fromJson(Map<String, dynamic> json) {
    final panesMap = <String, TmuxPane>{};
    final panesJson = json['panes'] as Map<String, dynamic>? ?? {};
    for (final entry in panesJson.entries) {
      panesMap[entry.key] =
          TmuxPane.fromJson(entry.value as Map<String, dynamic>);
    }
    return TmuxWindow(
      index: json['index']?.toString() ?? '0',
      name: json['name'] as String? ?? '',
      active: json['active'] as bool? ?? false,
      paneCount: json['pane_count'] as int?,
      panes: panesMap,
    );
  }
}

class TmuxSession {
  final String name;
  final Map<String, TmuxWindow> windows;

  const TmuxSession({required this.name, required this.windows});

  factory TmuxSession.fromJson(String name, Map<String, dynamic> json) {
    final windowsMap = <String, TmuxWindow>{};
    final windowsJson = json['windows'] as Map<String, dynamic>? ?? {};
    for (final entry in windowsJson.entries) {
      windowsMap[entry.key] =
          TmuxWindow.fromJson(entry.value as Map<String, dynamic>);
    }
    return TmuxSession(name: name, windows: windowsMap);
  }
}

class TmuxHierarchy {
  final Map<String, TmuxSession> sessions;

  const TmuxHierarchy({required this.sessions});

  factory TmuxHierarchy.fromJson(Map<String, dynamic> json) {
    final sessionsMap = <String, TmuxSession>{};
    for (final entry in json.entries) {
      sessionsMap[entry.key] = TmuxSession.fromJson(
        entry.key,
        entry.value as Map<String, dynamic>,
      );
    }
    return TmuxHierarchy(sessions: sessionsMap);
  }
}
