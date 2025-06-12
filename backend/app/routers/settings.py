from fastapi import APIRouter, HTTPException
import json
import os

from ..models import TmuxSettings, ApiResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_FILE = "tmux_settings.json"


def load_settings() -> TmuxSettings:
    """Load settings from file"""
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r') as f:
                data = json.load(f)
                return TmuxSettings(**data)
        else:
            return TmuxSettings()
    except Exception as e:
        print(f"Error loading settings: {e}")
        return TmuxSettings()


def save_settings(settings: TmuxSettings) -> bool:
    """Save settings to file"""
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings.dict(), f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving settings: {e}")
        return False


@router.get("/", response_model=TmuxSettings)
async def get_settings():
    """Get current settings"""
    return load_settings()


@router.put("/")
async def update_settings(settings: TmuxSettings):
    """Update settings"""
    try:
        success = save_settings(settings)
        
        if success:
            return ApiResponse(
                success=True,
                message="Settings updated successfully"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to save settings"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating settings: {str(e)}"
        )


@router.post("/test-connection")
async def test_connection():
    """Test tmux connection"""
    try:
        from ..services import TmuxService
        tmux_service = TmuxService()
        
        # Try to get sessions to test tmux availability
        sessions = await tmux_service.get_sessions()
        
        return ApiResponse(
            success=True,
            message="Connection test successful",
            data={"sessions": sessions}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Connection test failed: {str(e)}"
        )