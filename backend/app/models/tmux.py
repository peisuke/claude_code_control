from pydantic import BaseModel
from typing import Optional, Any


class CommandRequest(BaseModel):
    command: str
    target: str  # session, session:window, or session:window.pane


class TmuxSettings(BaseModel):
    capture_history: bool = True


class TmuxOutput(BaseModel):
    content: str
    timestamp: str
    target: str


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None