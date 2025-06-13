# Claude Code Control

A web-based tmux controller for remote development with Claude Code integration.

## Architecture
- **Frontend**: React 18 with Material-UI v5
- **Backend**: FastAPI with WebSocket support  
- **Structure**: Monorepo (frontend/backend separation)
- **Real-time**: WebSocket for live tmux output streaming

## Features
- 🤖 Claude Code remote development control
- 🚀 Send commands to tmux sessions, windows, and panes
- 📡 Real-time tmux output display with WebSocket
- 🎯 Hierarchical target selection (session:window.pane)
- 📱 Mobile-friendly responsive interface
- ⚙️ Session management and configuration
- 🎨 Material-UI based clean interface
- 🐳 Docker support for easy deployment
- 🐛 Debug mode for troubleshooting

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- tmux installed on the system

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

**Using Docker (Recommended)**
```bash
# Build and start
docker-compose up --build

# Or run in background
docker-compose up -d
```

**Manual Deployment**
```bash
# Build frontend
npm run build

# Start backend
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

# Serve frontend build (using nginx or similar)
```

## Usage

1. **コマンド送信タブ**
   - tmuxセッションにコマンドを送信
   - Enterキーでコマンド実行
   - 設定ボタンでセッション管理

2. **tmux表示タブ**  
   - tmuxセッションの出力をリアルタイム表示
   - 手動更新 or WebSocketリアルタイム更新
   - モノスペースフォントで見やすい表示

3. **設定**
   - セッション名の変更
   - 自動セッション作成の設定
   - 接続テスト機能

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
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API services
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── package.json             # Root package.json
```

### Available Scripts
```bash
npm run dev              # Start development servers
npm run install:all      # Install all dependencies
npm run build           # Build frontend
npm run docker:build    # Build Docker images
npm run docker:up       # Start with Docker
npm run docker:down     # Stop Docker containers
```

## Security Notes
- tmux sessions are accessed locally on the server
- WebSocket connections should be secured in production
- Consider authentication for production use

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
- Check if port 8000 is accessible
- Verify CORS settings in backend/app/config.py
- Check browser console for WebSocket errors

## Testing tmux Integration

### Creating Test Sessions
To test the hierarchical selection, create some tmux sessions:

```bash
# Create test sessions with multiple windows and panes
tmux new-session -d -s test1 -c ~/
tmux new-window -t test1 -n "logs" "tail -f /var/log/system.log"
tmux new-window -t test1 -n "editor"
tmux split-window -t test1:editor -h "htop"

tmux new-session -d -s test2 -c ~/
tmux new-window -t test2 -n "server" "python -m http.server 8080"
tmux split-window -t test2:server -v "watch -n 1 date"

# List created sessions
tmux list-sessions
```

### Target Format Examples
- `test1` - Send to entire session
- `test1:0` - Send to window 0 in test1 session  
- `test1:logs` - Send to "logs" window by name
- `test1:editor.0` - Send to pane 0 in "editor" window
- `test2:server.1` - Send to pane 1 in "server" window

### Debug Mode
Click the bug icon (🐛) in the target selector to view:
- Raw hierarchy data from tmux
- Parsed session/window/pane structure
- Current target parsing results