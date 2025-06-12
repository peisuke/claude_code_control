from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime


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


class TmuxPane(BaseModel):
    index: str
    active: bool
    command: str
    size: Optional[str] = None


class TmuxWindow(BaseModel):
    index: str
    name: str
    active: bool
    pane_count: Optional[int] = None
    panes: Dict[str, TmuxPane]


class TmuxSession(BaseModel):
    name: str
    windows: Dict[str, TmuxWindow]


class TmuxHierarchy(BaseModel):
    sessions: Dict[str, TmuxSession]


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None