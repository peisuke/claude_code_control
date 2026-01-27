"""Tests for settings router"""
import pytest
from httpx import AsyncClient, ASGITransport
import os
import json
from unittest.mock import patch, mock_open, MagicMock, AsyncMock

from app.main import app
from app.routers.settings import load_settings, save_settings, SETTINGS_FILE
from app.models import TmuxSettings


class TestLoadSettings:
    """Tests for load_settings function"""

    def test_load_settings_file_exists(self, tmp_path):
        """Test loading settings from existing file"""
        settings_data = {"session_name": "test-session", "auto_create_session": True, "capture_history": True}
        settings_file = tmp_path / "settings.json"
        settings_file.write_text(json.dumps(settings_data))

        with patch("app.routers.settings.SETTINGS_FILE", str(settings_file)):
            with patch("os.path.exists", return_value=True):
                with patch("builtins.open", mock_open(read_data=json.dumps(settings_data))):
                    settings = load_settings()

        assert settings.session_name == "test-session"

    def test_load_settings_file_not_exists(self):
        """Test loading settings when file doesn't exist"""
        with patch("os.path.exists", return_value=False):
            settings = load_settings()

        # Should return default settings
        assert isinstance(settings, TmuxSettings)

    def test_load_settings_invalid_json(self):
        """Test loading settings with invalid JSON"""
        with patch("os.path.exists", return_value=True):
            with patch("builtins.open", mock_open(read_data="invalid json")):
                settings = load_settings()

        # Should return default settings on error
        assert isinstance(settings, TmuxSettings)


class TestSaveSettings:
    """Tests for save_settings function"""

    def test_save_settings_success(self, tmp_path):
        """Test saving settings successfully"""
        settings = TmuxSettings(session_name="my-session", auto_create_session=True)
        settings_file = tmp_path / "settings.json"

        with patch("app.routers.settings.SETTINGS_FILE", str(settings_file)):
            result = save_settings(settings)

        assert result is True

    def test_save_settings_write_error(self):
        """Test save settings with write error"""
        settings = TmuxSettings()

        with patch("builtins.open", side_effect=PermissionError("Access denied")):
            result = save_settings(settings)

        assert result is False


class TestSettingsEndpoints:
    """Tests for settings API endpoints"""

    @pytest.mark.asyncio
    async def test_get_settings(self):
        """Test GET /api/settings/"""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/settings/")

        assert response.status_code == 200
        data = response.json()
        # Should have settings structure with session_name
        assert "session_name" in data

    @pytest.mark.asyncio
    async def test_update_settings(self):
        """Test PUT /api/settings/"""
        new_settings = {
            "session_name": "updated-session",
            "auto_create_session": True,
            "capture_history": False
        }

        with patch("app.routers.settings.save_settings", return_value=True):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                response = await ac.put("/api/settings/", json=new_settings)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_update_settings_failure(self):
        """Test PUT /api/settings/ when save fails"""
        new_settings = {
            "session_name": "test",
            "auto_create_session": False,
            "capture_history": True
        }

        with patch("app.routers.settings.save_settings", return_value=False):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                response = await ac.put("/api/settings/", json=new_settings)

        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_test_connection_success(self):
        """Test POST /api/settings/test-connection success"""
        mock_service = MagicMock()
        # get_sessions is an async method, so we need AsyncMock
        mock_service.get_sessions = AsyncMock(return_value=["session1", "session2"])

        with patch("app.services.TmuxService", return_value=mock_service):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                response = await ac.post("/api/settings/test-connection")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_test_connection_failure(self):
        """Test POST /api/settings/test-connection failure"""
        mock_service = MagicMock()
        mock_service.get_sessions = AsyncMock(side_effect=Exception("tmux not running"))

        with patch("app.services.TmuxService", return_value=mock_service):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                response = await ac.post("/api/settings/test-connection")

        assert response.status_code == 500
        assert "failed" in response.json()["detail"].lower()
