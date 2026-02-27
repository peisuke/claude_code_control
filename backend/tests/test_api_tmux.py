import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app


class TestTmuxRouterSendCommand:
    """Tests for /api/tmux/send-command endpoint"""

    def test_send_command_success(self, test_client, mock_tmux_service):
        response = test_client.post(
            "/api/tmux/send-command",
            json={"command": "ls -la", "target": "default"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Command sent" in data["message"]

    def test_send_command_failure(self, test_client, mock_tmux_service):
        mock_tmux_service.send_command.return_value = False

        response = test_client.post(
            "/api/tmux/send-command",
            json={"command": "ls", "target": "default"}
        )

        assert response.status_code == 500
        assert "Failed to send command" in response.json()["detail"]

    def test_send_command_missing_command(self, test_client):
        response = test_client.post(
            "/api/tmux/send-command",
            json={"target": "default"}
        )

        assert response.status_code == 422  # Validation error


class TestTmuxRouterSendEnter:
    """Tests for /api/tmux/send-enter endpoint"""

    def test_send_enter_success(self, test_client, mock_tmux_service):
        response = test_client.post("/api/tmux/send-enter?target=default")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Enter sent" in data["message"]

    def test_send_enter_missing_target(self, test_client, mock_tmux_service):
        response = test_client.post("/api/tmux/send-enter")

        assert response.status_code == 422

    def test_send_enter_failure(self, test_client, mock_tmux_service):
        mock_tmux_service.send_enter.return_value = False

        response = test_client.post("/api/tmux/send-enter?target=default")

        assert response.status_code == 500
        assert "Failed to send enter" in response.json()["detail"]


class TestTmuxRouterGetOutput:
    """Tests for /api/tmux/output endpoint"""

    def test_get_output_success(self, test_client, mock_tmux_service):
        response = test_client.get("/api/tmux/output?target=default")

        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert "timestamp" in data
        assert data["target"] == "default"

    def test_get_output_missing_target(self, test_client, mock_tmux_service):
        response = test_client.get("/api/tmux/output")

        assert response.status_code == 422

    def test_get_output_with_history(self, test_client, mock_tmux_service):
        response = test_client.get("/api/tmux/output?target=default&include_history=true")

        assert response.status_code == 200
        mock_tmux_service.get_output.assert_called_with("default", include_history=True, lines=None)

    def test_get_output_with_lines(self, test_client, mock_tmux_service):
        response = test_client.get("/api/tmux/output?target=default&include_history=true&lines=500")

        assert response.status_code == 200
        mock_tmux_service.get_output.assert_called_with("default", include_history=True, lines=500)


class TestTmuxRouterSessions:
    """Tests for /api/tmux/sessions endpoint"""

    def test_get_sessions_success(self, test_client, mock_tmux_service):
        response = test_client.get("/api/tmux/sessions")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "sessions" in data["data"]
        assert data["data"]["sessions"] == ["default", "test-session"]


class TestTmuxRouterHierarchy:
    """Tests for /api/tmux/hierarchy endpoint"""

    def test_get_hierarchy_success(self, test_client, mock_tmux_service):
        response = test_client.get("/api/tmux/hierarchy")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "default" in data["data"]


class TestTmuxRouterCreateSession:
    """Tests for /api/tmux/create-session endpoint"""

    def test_create_session_success(self, test_client, mock_tmux_service):
        response = test_client.post("/api/tmux/create-session?session_name=new-session")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "new-session" in data["message"]

    def test_create_session_failure(self, test_client, mock_tmux_service):
        mock_tmux_service.create_session.return_value = False

        response = test_client.post("/api/tmux/create-session?session_name=failed-session")

        assert response.status_code == 500
        assert "Failed to create session" in response.json()["detail"]


class TestTmuxRouterDeleteSession:
    """Tests for /api/tmux/session/{session_name} endpoint"""

    def test_delete_session_success(self, test_client, mock_tmux_service):
        response = test_client.delete("/api/tmux/session/test-session")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "deleted" in data["message"]

    def test_delete_session_failure(self, test_client, mock_tmux_service):
        mock_tmux_service.kill_session.return_value = False

        response = test_client.delete("/api/tmux/session/nonexistent")

        assert response.status_code == 500
        assert "Failed to delete session" in response.json()["detail"]


class TestTmuxRouterCreateWindow:
    """Tests for /api/tmux/create-window endpoint"""

    def test_create_window_success(self, test_client, mock_tmux_service):
        response = test_client.post("/api/tmux/create-window?session_name=default")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        mock_tmux_service.create_window.assert_called_with("default", None)

    def test_create_window_with_name(self, test_client, mock_tmux_service):
        response = test_client.post("/api/tmux/create-window?session_name=default&window_name=my-window")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "my-window" in data["message"]
        mock_tmux_service.create_window.assert_called_with("default", "my-window")

    def test_create_window_failure(self, test_client, mock_tmux_service):
        mock_tmux_service.create_window.return_value = False

        response = test_client.post("/api/tmux/create-window?session_name=default")

        assert response.status_code == 500
        assert "Failed to create window" in response.json()["detail"]


class TestTmuxRouterDeleteWindow:
    """Tests for /api/tmux/window/{session_name}/{window_index} endpoint"""

    def test_delete_window_success(self, test_client, mock_tmux_service):
        response = test_client.delete("/api/tmux/window/default/0")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "deleted" in data["message"]

    def test_delete_window_failure(self, test_client, mock_tmux_service):
        mock_tmux_service.kill_window.return_value = False

        response = test_client.delete("/api/tmux/window/default/99")

        assert response.status_code == 500
        assert "Failed to delete window" in response.json()["detail"]


class TestTmuxRouterRenameSession:
    """Tests for /api/tmux/rename-session endpoint"""

    def test_rename_session_success(self, test_client, mock_tmux_service):
        mock_tmux_service.rename_session = AsyncMock(return_value=True)

        response = test_client.put("/api/tmux/rename-session?old_name=old&new_name=new")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "renamed" in data["message"]
        mock_tmux_service.rename_session.assert_called_with("old", "new")

    def test_rename_session_failure(self, test_client, mock_tmux_service):
        mock_tmux_service.rename_session = AsyncMock(return_value=False)

        response = test_client.put("/api/tmux/rename-session?old_name=old&new_name=new")

        assert response.status_code == 500
        assert "Failed to rename session" in response.json()["detail"]


class TestTmuxRouterRenameWindow:
    """Tests for /api/tmux/rename-window endpoint"""

    def test_rename_window_success(self, test_client, mock_tmux_service):
        mock_tmux_service.rename_window = AsyncMock(return_value=True)

        response = test_client.put(
            "/api/tmux/rename-window?session_name=default&window_index=0&new_name=renamed"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "renamed" in data["message"]
        mock_tmux_service.rename_window.assert_called_with("default", "0", "renamed")

    def test_rename_window_failure(self, test_client, mock_tmux_service):
        mock_tmux_service.rename_window = AsyncMock(return_value=False)

        response = test_client.put(
            "/api/tmux/rename-window?session_name=default&window_index=0&new_name=renamed"
        )

        assert response.status_code == 500
        assert "Failed to rename window" in response.json()["detail"]


class TestTmuxRouterStatus:
    """Tests for /api/tmux/status endpoint"""

    def test_get_status_success(self, test_client, mock_tmux_service):
        response = test_client.get("/api/tmux/status")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "sessions" in data["data"]
        assert "active_connections" in data["data"]
