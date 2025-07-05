from .tmux import router as tmux_router
from .settings import router as settings_router
from .file import router as file_router

__all__ = ["tmux_router", "settings_router", "file_router"]