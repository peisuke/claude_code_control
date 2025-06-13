# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based tmux controller application that allows remote control of tmux sessions through a browser interface. It consists of:
- **Backend**: Python FastAPI with WebSocket support for real-time tmux output streaming
- **Frontend**: React TypeScript with Material-UI for the web interface
- **Integration**: Direct tmux command execution using subprocess calls

## Common Development Commands

### Development
```bash
# Install all dependencies (frontend and backend)
npm run install:all

# Start both frontend and backend in development mode
npm run dev

# Start frontend only (port 3000)
npm run dev:frontend

# Start backend only (port 8000)
npm run dev:backend
```

### Build and Deployment
```bash
# Build frontend for production
npm run build

# Build Docker images
npm run docker:build

# Start with Docker Compose
npm run docker:up

# Stop Docker containers
npm run docker:down
```

### Testing
```bash
# Run frontend tests
cd frontend && npm test

# No backend tests are configured yet
```

## Architecture Overview

### Backend Structure
The FastAPI backend (`backend/app/`) handles:
- **models/**: Pydantic models for request/response validation
- **routers/**: API endpoints for tmux operations and settings
- **services/**: Business logic including tmux command execution via subprocess
- **websocket/**: WebSocket connection manager for real-time output streaming
- **config.py**: CORS and application settings
- **main.py**: FastAPI application entry point

Key implementation details:
- tmux commands are executed using `subprocess.run()` with the tmux CLI
- WebSocket connections stream tmux output in real-time using `capture-pane`
- Session targeting supports hierarchical format: `session:window.pane`

### Frontend Structure
The React frontend (`frontend/src/`) provides:
- **components/**: UI components including CommandInput, TmuxDisplay, and Settings
- **hooks/**: Custom React hooks for WebSocket management
- **services/**: API client for backend communication
- **types/**: TypeScript interfaces for type safety

### tmux Integration
The application interacts with tmux through subprocess calls:
- Sends commands: `tmux send-keys -t <target> <command>`
- Captures output: `tmux capture-pane -t <target> -p`
- Lists sessions: `tmux list-sessions -F "#{session_name}"`
- Target format supports session, window, and pane selection

## Important Notes

- The backend requires tmux to be installed on the host system
- WebSocket connections are used for real-time output updates
- The application runs on ports 3000 (frontend) and 8000 (backend) by default
- API documentation is available at http://localhost:8000/docs when running
- No comprehensive linting or testing setup exists for the backend code