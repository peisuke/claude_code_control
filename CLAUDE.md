# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flutter (Dart) Android app that ports the React TypeScript frontend of the tmux controller application. The backend (FastAPI) is unchanged — the app communicates with it via HTTP REST and WebSocket.

```
Android App (Flutter)
  ↕ HTTP REST + WebSocket
Backend (FastAPI, port 8000/8080)
  ↕ tmux subprocess / socket
Host tmux server
```

**This is a porting project.** The web frontend (`frontend/src/`) is the source of truth. All logic must be ported function-by-function from the web code. Do not improvise or approximate — match the web behavior exactly.

## Working Directory

- **Git worktree**: `/home/ubuntu/workspace/src/claude_code_control-flutter` (branch `feature/flutter-android-app`)
- **Main repo**: `/home/ubuntu/workspace/src/claude_code_control` (branch `main`)
- **Flutter app root**: `flutter_app/`
- **Web source (reference)**: `frontend/src/` in the main repo

## Common Commands

```bash
# Flutter binary location
/home/ubuntu/flutter/bin/flutter

# Run all tests
cd flutter_app && /home/ubuntu/flutter/bin/flutter test

# Run specific test file
/home/ubuntu/flutter/bin/flutter test test/utils/ansi_parser_test.dart

# Build debug APK
/home/ubuntu/flutter/bin/flutter build apk --debug --dart-define=BACKEND_URL=http://<host-ip>:8080

# Analyze code
/home/ubuntu/flutter/bin/flutter analyze
```

## Tech Stack

- **Flutter 3.16+** / Dart 3.2+ (SDK `^3.6.2`)
- **State management**: flutter_riverpod `^2.6.1`
- **HTTP**: dio `^5.7.0`
- **WebSocket**: web_socket_channel `^3.0.2`
- **Storage**: shared_preferences `^2.3.4`
- **Font**: google_fonts `^6.2.1` (monospace: Ubuntu Mono)

## Project Structure

```
flutter_app/lib/
  main.dart                          # Entry point
  app.dart                           # MaterialApp + ProviderScope
  config/
    app_config.dart                  # Backend URL, timing constants, storage keys
    keyboard_constants.dart          # Tmux keyboard codes, labels, descriptions
    theme.dart                       # Material 3 theme (light/dark)
  models/
    tmux_output.dart                 # TmuxOutput (content, timestamp, target)
    tmux_session.dart                # TmuxSession, TmuxWindow, TmuxPane, TmuxHierarchy
    api_response.dart                # ApiResponse<T>
    file_node.dart                   # FileNode, FileTreeResponse, FileContentResponse
  services/
    api_service.dart                 # REST API (dio) — 13 endpoints
    websocket_service.dart           # WebSocket + reconnect (exponential backoff)
  providers/
    connection_provider.dart         # HTTP health check (5s interval)
    websocket_provider.dart          # WebSocket state + message stream
    output_provider.dart             # Terminal output state + scroll sync
    command_provider.dart            # Command execution + special keys
    session_provider.dart            # Session/window CRUD
    file_provider.dart               # File tree + content
    view_provider.dart               # View mode (tmux/file) persistence
    theme_provider.dart              # Dark mode persistence
    terminal_resize_provider.dart    # Container → cols/rows → resize API
  utils/
    ansi_parser.dart                 # ANSI SGR → TextSpan (8/bright/256/RGB colors)
    choice_detector.dart             # Yes/No choice detection from output
    scroll_utils.dart                # ScrollController utility
    tmux_utils.dart                  # Target parsing, command validation
  screens/
    home_screen.dart                 # Main scaffold + drawer + lifecycle
  widgets/
    terminal/
      terminal_output.dart           # ListView.builder + scroll management
      command_input_area.dart        # TextField + send button
      choice_buttons.dart            # Auto-detected choice buttons
      tmux_keyboard.dart             # Special key buttons (Ctrl+C, ESC, etc.)
    session/
      session_tree_view.dart         # Expandable session tree
      delete_confirmation_dialog.dart
    file/
      file_explorer.dart             # Directory listing + breadcrumb
      file_viewer.dart               # Text/image file viewer
    common/
      connection_status.dart         # Connection state chip
      settings_sheet.dart            # Dark mode + backend URL
      sidebar.dart                   # TabBar (session/file)

flutter_app/test/
  widget_test.dart                   # App renders without crashing
  config/
    keyboard_constants_test.dart     # Keyboard codes/labels/descriptions (3 tests)
  utils/
    tmux_utils_test.dart             # Target parse/build, sanitize, validate (15 tests)
    choice_detector_test.dart        # Choice detection logic (10 tests)
    ansi_parser_test.dart            # ANSI SGR parsing + stripAnsi (26 tests)
    scroll_utils_test.dart           # ScrollUtils null/delay handling (4 tests)
  providers/
    output_provider_test.dart        # Output state + WS message + history (18 tests)
    command_provider_test.dart       # Command/enter/special key sending (16 tests)
    view_provider_test.dart          # View mode persistence (6 tests)
    file_provider_test.dart          # File tree + content loading (8 tests)
    terminal_resize_provider_test.dart # Resize calculation + constants (5 tests)
    connection_provider_test.dart    # HTTP health check polling (9 tests)
    theme_provider_test.dart         # Dark mode boolean persistence (10 tests)
    websocket_provider_test.dart     # WS state + auto-connect logic (11 tests)
  services/
    api_service_test.dart            # REST API all 13 endpoints (35 tests)
    websocket_service_test.dart      # WebSocket protocol + reconnect (53 tests)
  helpers/
    widget_test_helpers.dart         # Shared ProviderScope + mock API helpers
  widgets/
    connection_status_test.dart      # Connection status chip 3 states (7 tests)
    tmux_keyboard_test.dart          # Keyboard buttons + disabled (8 tests)
    choice_buttons_test.dart         # Choice detection + buttons (5 tests)
    command_input_area_test.dart     # Input + buttons + expand (13 tests)
    settings_sheet_test.dart         # Settings UI + dark mode + URL (11 tests)
    session_tree_view_test.dart      # Session tree + expansion + icons (13 tests)
    file_explorer_test.dart          # File tree + breadcrumbs + icons (14 tests)
    file_viewer_test.dart            # File content + images + line numbers (10 tests)
    terminal_output_test.dart        # Terminal rendering + ANSI + styling (11 tests)
    home_screen_test.dart            # Layout + lifecycle + app bar (14 tests)
    theme_widget_test.dart           # Theme integration + Material 3 (7 tests)
```

## Architecture — Web → Flutter Mapping

### State Management
| Web (React hooks) | Flutter (Riverpod) |
|---|---|
| `useOutputState` + `useScrollBasedOutput` | `OutputNotifier` (output_provider.dart) |
| `useCommandState` | `CommandNotifier` (command_provider.dart) |
| `useConnectionState` | `ConnectionNotifier` (connection_provider.dart) |
| `useWebSocket` | `WebSocketService` (websocket_service.dart) |
| `useViewState` | `ViewNotifier` (view_provider.dart) |
| `useFileContent` | `FileNotifier` (file_provider.dart) |
| `useTerminalResize` | `TerminalResizeNotifier` (terminal_resize_provider.dart) |
| `useAppVisibility` | `WidgetsBindingObserver` in home_screen.dart |
| `useLocalStorageState` | `SharedPreferences` |
| `useRef` (sync flags) | Plain class fields on widget state / notifier |

### Scroll Management (Critical)

The scroll system in `terminal_output.dart` has a 21-item checklist mapping every web ref/function. Key synchronous flags:

| # | Web ref | Flutter field |
|---|---|---|
| 1 | `userScrolledUpRef` | `_userScrolledUp` |
| 2 | `lastScrollHeightRef` | `_lastMaxScrollExtent` |
| 6 | `lastScrollTopRef` | `_previousPixels` |
| 18 | pointer events | `_userIsTouching` (via Listener widget) |
| 19 | fling lifecycle | `_userScrollInProgress` (via NotificationListener) |
| 20 | programmatic scroll guard | `_isAutoScrolling` |

Content-change detection: if `maxScrollExtent` changed by >0.5, the scroll event is from content update, not user action — `_onScroll` skips it entirely.

### ANSI Rendering

`ListView.builder` + per-line `Text.rich(TextSpan(...))`:
- Lines cached in `_lineCache` (invalidated when content changes)
- Lazy rendering (only visible lines built)
- `AnsiParser.parseLine()` handles SGR 0-107, 256-color (38;5;n), 24-bit RGB (38;2;r;g;b)

## Test Porting Status

Tests are ported from `frontend/src/**/__tests__/*.test.{ts,tsx}` (28 web files, 593 test cases total).

### Ported (338 tests, all passing)

**Utility/config tests:**
- `tmux.test.ts` → `tmux_utils_test.dart` (15)
- `useChoiceDetection.test.ts` → `choice_detector_test.dart` (10)
- `keyboard.test.ts` → `keyboard_constants_test.dart` (3)
- `scroll.test.ts` → `scroll_utils_test.dart` (4)
- ANSI parser (Flutter-only) → `ansi_parser_test.dart` (26)

**Service tests:**
- `api.test.ts` → `api_service_test.dart` (35)
- `websocket.test.ts` → `websocket_service_test.dart` (53)

**Provider tests:**
- `useOutputState.test.ts` + `useScrollBasedOutput.test.ts` → `output_provider_test.dart` (18)
- `useCommandState.test.ts` + `useTmux.test.ts` → `command_provider_test.dart` (16)
- `useViewState.test.ts` → `view_provider_test.dart` (6)
- `useFileContent.test.ts` → `file_provider_test.dart` (8)
- `useConnectionState.test.ts` (health check) → `connection_provider_test.dart` (9)
- `useLocalStorageState.test.ts` (boolean) → `theme_provider_test.dart` (10)
- `useAutoRefreshState.test.ts` + `useConnectionState.test.ts` (WS) → `websocket_provider_test.dart` (11)
- Terminal resize (Flutter-only) → `terminal_resize_provider_test.dart` (5)

**Widget tests:**
- `ConnectionStatus.test.tsx` → `connection_status_test.dart` (7)
- `TmuxKeyboard.test.tsx` → `tmux_keyboard_test.dart` (8)
- `ChoiceButtons.test.tsx` → `choice_buttons_test.dart` (5)
- `CommandInputArea.test.tsx` → `command_input_area_test.dart` (13)
- `SettingsModal.test.tsx` → `settings_sheet_test.dart` (11)
- `SessionTreeView.test.tsx` + `SessionManager.test.tsx` → `session_tree_view_test.dart` (13)
- `FileExplorer.test.tsx` → `file_explorer_test.dart` (14)
- `FileOperations.test.tsx` → `file_viewer_test.dart` (10)
- `TerminalOutput.test.tsx` → `terminal_output_test.dart` (11)
- `TmuxViewContainer.test.tsx` + `useAppVisibility.test.ts` → `home_screen_test.dart` (14)
- `ThemeContext.test.tsx` → `theme_widget_test.dart` (7) + `theme_provider_test.dart` (10)
- Widget smoke test → `widget_test.dart` (1)

### All web test files ported
All 28 web test files have been ported to Flutter. Some web-specific tests (DOM refs, dangerouslySetInnerHTML, React context patterns) were adapted to Flutter equivalents or omitted where not applicable.

## Android Configuration

- `AndroidManifest.xml`: INTERNET, ACCESS_NETWORK_STATE permissions
- Emulator: `--dart-define=BACKEND_URL=http://10.0.2.2:8080`
- Physical device: `--dart-define=BACKEND_URL=http://<host-ip>:8080`
- App settings allow runtime URL change

## Porting Guidelines

1. **Read the web source first** — don't guess behavior
2. **Port tests before implementation** — tests define the spec
3. **Function-level mapping** — create a checklist for complex logic
4. **Synchronous flags** — use plain class fields, not Riverpod state, for flags checked in hot paths (scroll handlers, WS message handlers)
5. **No improvisation** — if the web does X, Flutter does X. Platform adaptations (e.g., Listener instead of mousedown) should be documented with comments referencing the web equivalent

## Git Workflow

- **MUST use `git worktree`** for all feature/fix work
- This worktree is at `/home/ubuntu/workspace/src/claude_code_control-flutter` on branch `feature/flutter-android-app`
- Main repo is at `/home/ubuntu/workspace/src/claude_code_control` on branch `main`
