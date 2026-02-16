from typing import Dict, List
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, session_name: str):
        await websocket.accept()
        if session_name not in self.active_connections:
            self.active_connections[session_name] = []
        self.active_connections[session_name].append(websocket)
    
    def disconnect(self, websocket: WebSocket, session_name: str):
        if session_name in self.active_connections:
            if websocket in self.active_connections[session_name]:
                self.active_connections[session_name].remove(websocket)
            # Clean up empty session lists
            if not self.active_connections[session_name]:
                del self.active_connections[session_name]
    
    def has_connections_for_session(self, session_name: str) -> bool:
        return session_name in self.active_connections and len(self.active_connections[session_name]) > 0
    
    async def send_personal_message(self, message: str, websocket: WebSocket, session_name: str):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.debug(f"Error sending message: {e}")
            self.disconnect(websocket, session_name)
    
    async def broadcast_to_session(self, session_name: str, message: str):
        if session_name not in self.active_connections:
            return
            
        disconnected = []
        for connection in self.active_connections[session_name]:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.debug(f"Error broadcasting to connection in session {session_name}: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection, session_name)
    
    async def broadcast(self, message: str):
        """Broadcast to all sessions"""
        for session_name in list(self.active_connections.keys()):
            await self.broadcast_to_session(session_name, message)
    
    def get_total_connections(self) -> int:
        return sum(len(connections) for connections in self.active_connections.values())