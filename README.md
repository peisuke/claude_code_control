# Claude Code Control

Web interface for controlling Claude Code development sessions through tmux. Monitor and interact with your Claude Code sessions in real-time from your browser.

## Overview

Claude Code Control provides a web-based interface to interact with tmux sessions where Claude Code is running. This allows you to:
- Monitor Claude Code's terminal output in real-time
- Send commands to Claude Code sessions
- Manage multiple tmux sessions, windows, and panes
- View live updates via WebSocket streaming

## Architecture
- **Frontend**: React 18 with TypeScript and Material-UI v5
- **Backend**: FastAPI (Python) with WebSocket support
- **Integration**: Direct tmux command execution on the host machine
- **Real-time Updates**: WebSocket streaming for live output

## Features
- 🤖 **Claude Code Integration**: Monitor and control Claude Code development sessions
- 📡 **Real-time Output**: Live tmux output streaming via WebSocket
- 🎯 **Flexible Targeting**: Send commands to specific sessions, windows, or panes
- 🖥️ **Unified Interface**: Combined command input and output display
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚙️ **Session Management**: Create, delete, and switch between tmux sessions
- 🎨 **Modern UI**: Clean Material-UI interface with ANSI color support
- 🐛 **Debug Mode**: View raw tmux hierarchy for troubleshooting

## Quick Start

### Prerequisites
- **Python 3.11+** (for FastAPI backend)
- **Node.js 18+** (for React frontend)
- **tmux** (must be installed and accessible)
- **Claude Code** (running in tmux sessions)

### Development Setup

1. **Install all dependencies**
```bash
npm run install:all
```

2. **Run development servers**
```bash
# Start both frontend and backend
npm run dev

# Or start individually:
# Backend: npm run dev:backend
# Frontend: npm run dev:frontend
```

3. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Production Deployment

```bash
# Build frontend
npm run build

# Start backend
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

# Serve frontend build (using nginx or similar)
```

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

3. Access the web interface at http://localhost:3000

### Web Interface

**Unified View** (Recommended)
- Combined command input and output display
- Real-time output streaming with auto-scroll
- Send commands or press Enter key
- Toggle between manual refresh and live updates

**Target Selection**
- Select tmux sessions from the dropdown
- Format: `session:window.pane` (e.g., `claude-code:0.0`)
- Debug mode shows raw tmux hierarchy

**Session Management** (Settings)
- Create new tmux sessions
- Delete existing sessions
- Create windows within sessions
- View session hierarchy

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
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API services
│   │   └── types/           # TypeScript types
│   └── package.json
└── package.json             # Root package.json
```

### Available Scripts
```bash
npm run dev              # Start development servers
npm run install:all      # Install all dependencies
npm run build           # Build frontend
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
# Check tmux socket permissions
ls -la /tmp/tmux-*
```

### WebSocket connection issues
- Check if ports 3000 and 8000 are available
- Verify CORS settings in backend/app/config.py
- Check browser console for detailed error messages
- Ensure the backend can access tmux on the host

## Testing tmux Integration

### Working with Claude Code

**Monitoring Claude Code Output**
```bash
# Create a dedicated session for Claude Code
tmux new-session -s claude-code

# Run Claude Code
claude-code

# Access web interface to monitor output
# http://localhost:3000
```

**Multiple Claude Code Sessions**
```bash
# Development session
tmux new-session -d -s claude-dev -c ~/project
tmux send-keys -t claude-dev "claude-code" Enter

# Testing session
tmux new-session -d -s claude-test -c ~/project/tests
tmux send-keys -t claude-test "claude-code" Enter
```

**Sending Commands to Claude Code**
- Use the web interface to send commands
- Commands are sent directly to the tmux pane
- View responses in real-time

### Tips
- Use descriptive session names for easy identification
- The web interface auto-reconnects if the WebSocket connection drops
- Enable "Real-time" mode for live updates during active development
- Use manual refresh for better performance when reviewing static output

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Test with multiple tmux sessions before submitting

## License

MIT License - feel free to use this project for personal or commercial purposes.