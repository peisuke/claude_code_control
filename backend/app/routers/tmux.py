from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime
import json
import asyncio

from ..models import CommandRequest, TmuxOutput, ApiResponse, TmuxHierarchy
from ..services import TmuxService
from ..websocket import ConnectionManager

router = APIRouter(prefix="/api/tmux", tags=["tmux"])
tmux_service = TmuxService()
manager = ConnectionManager()

# Background task to monitor tmux output
background_tasks = {}
last_outputs = {}


@router.post("/send-command")
async def send_command(request: CommandRequest):
    """Send command to tmux session"""
    try:
        success = await tmux_service.send_command(
            request.command, 
            request.target
        )
        
        if success:
            return ApiResponse(
                success=True,
                message="Command sent successfully"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to send command"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error sending command: {str(e)}"
        )


@router.post("/send-enter")
async def send_enter(target: str = "default"):
    """Send Enter key to tmux target"""
    try:
        success = await tmux_service.send_enter(target)
        
        if success:
            return ApiResponse(
                success=True,
                message="Enter sent successfully"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to send enter"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error sending enter: {str(e)}"
        )


@router.get("/output")
async def get_output(target: str = "default"):
    """Get current tmux target output"""
    try:
        output = await tmux_service.get_output(target)
        
        return TmuxOutput(
            content=output,
            timestamp=datetime.now().isoformat(),
            target=target
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting output: {str(e)}"
        )


@router.get("/sessions")
async def get_sessions():
    """Get list of available tmux sessions"""
    try:
        sessions = await tmux_service.get_sessions()
        
        return ApiResponse(
            success=True,
            message="Sessions retrieved successfully",
            data={
                "sessions": sessions,
                "count": len(sessions)
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting sessions: {str(e)}"
        )


@router.get("/hierarchy")
async def get_hierarchy():
    """Get complete tmux hierarchy (sessions -> windows -> panes)"""
    try:
        hierarchy = await tmux_service.get_hierarchy()
        
        return ApiResponse(
            success=True,
            message="Hierarchy retrieved successfully",
            data=hierarchy
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting hierarchy: {str(e)}"
        )


@router.get("/status")
async def get_status():
    """Get tmux status and available sessions"""
    try:
        sessions = await tmux_service.get_sessions()
        
        return ApiResponse(
            success=True,
            message="Status retrieved successfully",
            data={
                "sessions": sessions,
                "active_connections": manager.get_total_connections()
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting status: {str(e)}"
        )


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
            print(f"Error in monitor task for target {target}: {e}")
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
    
    try:
        while True:
            # Keep connection alive and handle client messages
            message = await websocket.receive_text()
            # Could handle target switching here if needed
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, target)
        
        # Stop background task if no active connections for this target
        if not manager.has_connections_for_session(target):
            if target in background_tasks:
                background_tasks[target].cancel()
                del background_tasks[target]
                if target in last_outputs:
                    del last_outputs[target]