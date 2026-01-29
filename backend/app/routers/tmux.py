from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime
from typing import Optional, TypeVar, Callable, Awaitable
import json
import asyncio
import logging

from ..models import CommandRequest, TmuxOutput, ApiResponse

logger = logging.getLogger(__name__)
from ..services import TmuxService
from ..websocket import ConnectionManager

router = APIRouter(prefix="/api/tmux", tags=["tmux"])
tmux_service = TmuxService()
manager = ConnectionManager()

# Background task to monitor tmux output
background_tasks = {}
last_outputs = {}

T = TypeVar('T')


async def _handle_tmux_operation(
    operation: Callable[[], Awaitable[T]],
    error_context: str,
) -> T:
    """Execute a tmux operation with standardized error handling.

    Wraps the operation in a try/except and raises HTTPException on failure.
    """
    try:
        return await operation()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error {error_context}: {str(e)}"
        )


def _require_success(success: bool, failure_detail: str) -> None:
    """Raise HTTPException if the tmux operation was not successful."""
    if not success:
        raise HTTPException(status_code=500, detail=failure_detail)


@router.post("/send-command")
async def send_command(request: CommandRequest):
    """Send command to tmux session"""
    async def _op():
        success = await tmux_service.send_command(request.command, request.target)
        _require_success(success, "Failed to send command")
        return ApiResponse(success=True, message="Command sent successfully")

    return await _handle_tmux_operation(_op, "sending command")


@router.post("/send-enter")
async def send_enter(target: str = "default"):
    """Send Enter key to tmux target"""
    async def _op():
        success = await tmux_service.send_enter(target)
        _require_success(success, "Failed to send enter")
        return ApiResponse(success=True, message="Enter sent successfully")

    return await _handle_tmux_operation(_op, "sending enter")


@router.get("/output")
async def get_output(target: str = "default", include_history: bool = False, lines: Optional[int] = None):
    """Get current tmux target output, optionally including scrollback history"""
    async def _op():
        output = await tmux_service.get_output(target, include_history=include_history, lines=lines)
        return TmuxOutput(
            content=output,
            timestamp=datetime.now().isoformat(),
            target=target
        )

    return await _handle_tmux_operation(_op, "getting output")


@router.get("/sessions")
async def get_sessions():
    """Get list of available tmux sessions"""
    async def _op():
        sessions = await tmux_service.get_sessions()
        return ApiResponse(
            success=True,
            message="Sessions retrieved successfully",
            data={"sessions": sessions, "count": len(sessions)}
        )

    return await _handle_tmux_operation(_op, "getting sessions")


@router.get("/hierarchy")
async def get_hierarchy():
    """Get complete tmux hierarchy (sessions -> windows -> panes)"""
    async def _op():
        hierarchy = await tmux_service.get_hierarchy()
        return ApiResponse(success=True, message="Hierarchy retrieved successfully", data=hierarchy)

    return await _handle_tmux_operation(_op, "getting hierarchy")


@router.post("/create-session")
async def create_session(session_name: str):
    """Create a new tmux session"""
    async def _op():
        success = await tmux_service.create_session(session_name)
        _require_success(success, f"Failed to create session '{session_name}'")
        return ApiResponse(success=True, message=f"Session '{session_name}' created successfully")

    return await _handle_tmux_operation(_op, "creating session")


@router.delete("/session/{session_name}")
async def delete_session(session_name: str):
    """Delete a tmux session"""
    async def _op():
        success = await tmux_service.kill_session(session_name)
        _require_success(success, f"Failed to delete session '{session_name}'")
        return ApiResponse(success=True, message=f"Session '{session_name}' deleted successfully")

    return await _handle_tmux_operation(_op, "deleting session")


@router.post("/create-window")
async def create_window(session_name: str, window_name: str = None):
    """Create a new window in a tmux session"""
    async def _op():
        success = await tmux_service.create_window(session_name, window_name)
        _require_success(success, f"Failed to create window in session '{session_name}'")
        message = f"Window created in session '{session_name}'"
        if window_name:
            message += f" with name '{window_name}'"
        return ApiResponse(success=True, message=message)

    return await _handle_tmux_operation(_op, "creating window")


@router.delete("/window/{session_name}/{window_index}")
async def delete_window(session_name: str, window_index: str):
    """Delete a window from a tmux session"""
    async def _op():
        success = await tmux_service.kill_window(session_name, window_index)
        _require_success(success, f"Failed to delete window '{window_index}' from session '{session_name}'")
        return ApiResponse(
            success=True,
            message=f"Window '{window_index}' deleted from session '{session_name}'"
        )

    return await _handle_tmux_operation(_op, "deleting window")


@router.get("/status")
async def get_status():
    """Get tmux status and available sessions"""
    async def _op():
        sessions = await tmux_service.get_sessions()
        return ApiResponse(
            success=True,
            message="Status retrieved successfully",
            data={"sessions": sessions, "active_connections": manager.get_total_connections()}
        )

    return await _handle_tmux_operation(_op, "getting status")


async def monitor_target_output(target: str):
    """Background task to monitor specific tmux target output"""
    global background_tasks, last_outputs

    while target in background_tasks:
        try:
            current_output = await tmux_service.get_output(target)

            if current_output != last_outputs.get(target, ""):
                last_outputs[target] = current_output
                output_data = TmuxOutput(
                    content=current_output,
                    timestamp=datetime.now().isoformat(),
                    target=target
                )
                await manager.broadcast_to_session(target, json.dumps(output_data.dict()))

            await asyncio.sleep(2)  # Check every 2 seconds

        except Exception as e:
            logger.error(f"Error in monitor task for target {target}: {e}")
            await asyncio.sleep(5)


@router.websocket("/ws/{target:path}")
async def websocket_endpoint(websocket: WebSocket, target: str = "default"):
    """WebSocket endpoint for real-time tmux output of specific target"""
    global background_tasks

    await manager.connect(websocket, target)

    # Start background monitoring for this target if not already running
    if target not in background_tasks:
        task = asyncio.create_task(monitor_target_output(target))
        background_tasks[target] = task

    # Send initial heartbeat
    try:
        await websocket.send_text(json.dumps({"type": "heartbeat", "timestamp": datetime.now().isoformat()}))
    except Exception as e:
        logger.warning(f"Failed to send initial heartbeat: {e}")

    # Heartbeat task
    async def send_heartbeat():
        try:
            while True:
                await asyncio.sleep(15)  # Send heartbeat every 15 seconds
                await websocket.send_text(json.dumps({"type": "heartbeat", "timestamp": datetime.now().isoformat()}))
        except Exception as e:
            logger.debug(f"Heartbeat stopped: {e}")
            return

    heartbeat_task = asyncio.create_task(send_heartbeat())

    try:
        while True:
            try:
                # Set timeout for receiving messages - reduced for faster detection
                message = await asyncio.wait_for(websocket.receive_text(), timeout=20.0)
                # Handle client messages (like heartbeat responses)
                try:
                    parsed = json.loads(message)
                    if parsed.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.now().isoformat()}))
                except json.JSONDecodeError:
                    pass  # Ignore invalid JSON

            except asyncio.TimeoutError:
                # No message received in 20 seconds, continue
                continue
            except Exception as e:
                logger.debug(f"Error receiving message: {e}")
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Cleanup
        heartbeat_task.cancel()
        manager.disconnect(websocket, target)

        # Stop background task if no active connections for this target
        if not manager.has_connections_for_session(target):
            if target in background_tasks:
                background_tasks[target].cancel()
                del background_tasks[target]
                if target in last_outputs:
                    del last_outputs[target]
