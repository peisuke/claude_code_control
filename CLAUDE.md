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

# Development with test environment (separate ports)
npm run dev:test          # Both frontend (port 3010) and backend (port 8010)
npm run dev:frontend:test # Frontend only on port 3010
npm run dev:backend:test  # Backend only on port 8010
```

### Build and Testing
```bash
# Build frontend for production
npm run build

# Run frontend tests
cd frontend && npm test

# Frontend tests use Jest and React Testing Library
# No backend tests are configured yet
```

## Dependencies and Configuration

### Backend Dependencies (Python)
- **FastAPI** (0.115.6): Web framework with automatic API documentation
- **Uvicorn** (0.34.0): ASGI server with live reload support
- **WebSockets** (14.1): WebSocket protocol implementation
- **Pydantic** (2.10.4): Data validation and settings management
- **aiofiles** (24.1.0): Async file operations

### Frontend Dependencies (TypeScript/React)
- **React** (18.2.0): UI framework with TypeScript support
- **Material-UI** (5.14.x): Component library for consistent design
- **react-syntax-highlighter** (15.6.1): Code syntax highlighting
- **ansi-to-html** (0.7.2): Terminal output formatting
- **@emotion/react** & **@emotion/styled**: CSS-in-JS styling

### TypeScript Configuration
- Target: ES5 with DOM and ES6 libraries
- Strict mode enabled with consistent casing enforcement
- Module resolution: Node.js style
- JSX: React 17+ automatic runtime

## Architecture Overview

### Backend Structure (`backend/app/`)
- **main.py**: FastAPI application with CORS configuration
- **config.py**: Pydantic settings with environment variable support
- **models/**: Pydantic models for API request/response validation
- **routers/**: API endpoints organized by functionality
  - `tmux.py`: tmux session management and command execution
  - `settings.py`: Application settings management
  - `file.py`: File system operations
- **services/**: Business logic layer
  - `tmux_service.py`: Async tmux command execution with subprocess
- **websocket/**: WebSocket connection management for real-time updates

### Frontend Structure (`frontend/src/`)
- **components/**: React components with TypeScript
  - Material-UI based UI components
  - Responsive design with mobile support
  - Real-time terminal output display with ANSI color support
- **hooks/**: Custom React hooks
  - `useWebSocket.ts`: WebSocket connection management
  - `useTmux.ts`: tmux API integration
  - `useSettings.ts`: Application settings state
- **services/**: API client layer
  - `api.ts`: REST API communication
  - `websocket.ts`: WebSocket service
- **types/**: TypeScript interface definitions for type safety

### tmux Integration
The application uses async subprocess calls to interact with tmux:
- **Command execution**: `tmux send-keys -t <target> <command>`
- **Output capture**: `tmux capture-pane -t <target> -p`
  - Supports history capture with `-S` flag
  - ANSI escape sequences preserved with `-e` flag
- **Session management**: Creation, listing, and hierarchy traversal
- **Target format**: Supports `session`, `session:window`, and `session:window.pane`

## Code Conventions

### Backend (Python)
- **Async/await**: All I/O operations use asyncio patterns
- **Type hints**: Full type annotation using Python 3.9+ syntax
- **Error handling**: Comprehensive exception handling with logging
- **Configuration**: Environment-based settings via Pydantic
- **API design**: RESTful endpoints with automatic OpenAPI documentation

### Frontend (React/TypeScript)
- **Functional components**: React hooks pattern with TypeScript
- **Material-UI**: Consistent theming and responsive design
- **State management**: React hooks for local state, custom hooks for complex logic
- **Error boundaries**: Proper error handling and user feedback
- **Internationalization**: Mixed Japanese/English labels (current implementation)

### File Organization
- **Backend**: Domain-driven structure with clear separation of concerns
- **Frontend**: Feature-based component organization
- **Shared types**: TypeScript interfaces for API contract definition
- **Configuration**: Environment files ignored, defaults in code

## Development Environment

### Ports and Services
- **Frontend development**: Port 3000 (proxy to backend on 8000)
- **Backend development**: Port 8000 (CORS enabled for frontend)
- **Test environment**: Frontend 3010, Backend 8010
- **Health check**: `/health` endpoint available

### Runtime Requirements
- **tmux**: Must be installed on the host system
- **Python 3.9+**: For backend async features
- **Node.js 16+**: For frontend development

### Configuration
- **CORS origins**: Configured for localhost:3000 and localhost:3010
- **Environment variables**: Loaded via Pydantic settings
- **Debug mode**: Configurable via environment
- **Default session**: "default" tmux session auto-creation

## Important Notes

- **Security**: No authentication implemented - intended for trusted environments
- **Real-time updates**: WebSocket connections provide live tmux output streaming
- **Session management**: Automatic session creation when targets don't exist
- **Error handling**: User-friendly error messages with technical details in logs
- **Mobile support**: Responsive design with touch-friendly controls
- **Performance**: Efficient WebSocket message handling with smart scrolling