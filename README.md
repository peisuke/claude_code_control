# Claude Code Control

Interface for controlling Claude Code development sessions through tmux. Monitor and interact with your Claude Code sessions in real-time.

## Overview

Claude Code Control provides an interface to interact with tmux sessions where Claude Code is running. This allows you to:
- Monitor Claude Code's terminal output in real-time
- Send commands to Claude Code sessions
- Manage multiple tmux sessions, windows, and panes
- View live updates via WebSocket streaming

## Architecture
- **Android App**: Flutter (Dart) with Riverpod state management
- **Backend**: FastAPI (Python) with WebSocket support
- **Integration**: Direct tmux command execution on the host machine
- **Real-time Updates**: WebSocket streaming for live output

## Features
- Real-time Output: Live tmux output streaming via WebSocket
- Flexible Targeting: Send commands to specific sessions, windows, or panes
- Session Management: Create, delete, and switch between tmux sessions
- ANSI Color Support: Full SGR rendering (8/256/RGB colors)
- File Explorer: Browse and view files on the host
- Dark Mode: Persistent theme toggle

## Quick Start

### Prerequisites
- **Python 3.11+** (for FastAPI backend)
- **Flutter 3.16+** (for Android app)
- **tmux** (must be installed and accessible)
- **Claude Code** (running in tmux sessions)

### Install via Homebrew (macOS)

```bash
brew tap peisuke/tap
brew install claude-code-control

# Start as a background service (launchd)
brew services start claude-code-control

# Or run directly
claude-code-control
```

Logs: `$(brew --prefix)/var/log/claude-code-control.log`
Config: `$(brew --prefix)/etc/claude-code-control/config.env`

### Development Setup

1. **Install backend dependencies**
```bash
cd backend && pip install -r requirements-dev.txt
```

2. **Run backend server**
```bash
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8192
```

3. **Build Flutter app**
```bash
cd flutter_app
flutter build apk --debug --dart-define=BACKEND_URL=http://<host-ip>:8192
```

4. **Access the backend API**
- Backend API: http://localhost:8192
- API Docs: http://localhost:8192/docs

## Usage

### Starting Claude Code
1. Start a tmux session:
   ```bash
   tmux new-session -s claude-code
   ```

2. Run Claude Code in the tmux session:
   ```bash
   claude-code
   ```

3. Connect via the Android app (configure backend URL in settings)

## API Endpoints

### tmux Operations
- `POST /api/tmux/send-command` - Send command to tmux
- `POST /api/tmux/send-enter` - Send Enter key
- `GET /api/tmux/output` - Get current output
- `GET /api/tmux/status` - Get session status
- `WS /api/tmux/ws` - WebSocket for real-time output

### Settings
- `GET /api/settings/` - Get current settings
- `PUT /api/settings/` - Update settings
- `POST /api/settings/test-connection` - Test tmux connection

## Development

### Project Structure
```
├── backend/
│   ├── app/
│   │   ├── models/          # Pydantic models
│   │   ├── routers/         # FastAPI routers
│   │   ├── services/        # Business logic
│   │   ├── websocket/       # WebSocket manager
│   │   └── main.py          # FastAPI app
│   └── requirements.txt
├── flutter_app/
│   ├── lib/
│   │   ├── config/          # App config, theme, keyboard constants
│   │   ├── models/          # Data models
│   │   ├── providers/       # Riverpod providers
│   │   ├── services/        # API and WebSocket services
│   │   ├── utils/           # ANSI parser, utilities
│   │   ├── screens/         # Home screen
│   │   └── widgets/         # UI components
│   └── test/                # 338+ tests
├── packaging/
│   ├── homebrew/            # Homebrew formula for macOS
│   └── ...                  # .deb build for Ubuntu/Debian
├── Makefile                 # Build/run targets (make help)
└── Dockerfile               # Backend Docker image
```

## Security Notes
- This tool directly executes tmux commands on the host machine
- Only run on trusted networks or localhost
- No authentication is implemented - add security layers for production use
- WebSocket connections should be secured with TLS in production

## Troubleshooting

### tmux not found
```bash
# Ubuntu/Debian
sudo apt-get install tmux

# macOS
brew install tmux
```

### Permission issues
Make sure the application has access to tmux sockets:
```bash
ls -la /tmp/tmux-*
```

## License

MIT License - feel free to use this project for personal or commercial purposes.
