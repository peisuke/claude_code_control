from pydantic import BaseModel
from typing import Optional, Any


class CommandRequest(BaseModel):
    command: str
    target: Optional[str] = "default"  # Can be session, session:window, or session:window.pane


class TmuxSettings(BaseModel):
    session_name: str = "default"
    auto_create_session: bool = True
    capture_history: bool = True


class TmuxOutput(BaseModel):
    content: str
    timestamp: str
    target: str


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None