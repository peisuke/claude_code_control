import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.tmux_service import TmuxService


def pytest_configure(config):
    """Unregister ROS pytest plugins that cause conflicts"""
    import pluggy
    pm = config.pluginmanager

    # Try to unregister ROS plugins
    for plugin_name in ['launch_testing', 'launch_testing_ros']:
        try:
            plugin = pm.get_plugin(plugin_name)
            if plugin:
                pm.unregister(plugin)
        except Exception:
            pass


@pytest.fixture
def test_client():
    """Synchronous test client for FastAPI"""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """Async test client for FastAPI"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_tmux_service():
    """Mock TmuxService for testing without actual tmux"""
    with patch('app.routers.tmux.tmux_service') as mock_service:
        mock_service.send_command = AsyncMock(return_value=True)
        mock_service.send_enter = AsyncMock(return_value=True)
        mock_service.get_output = AsyncMock(return_value="terminal output")
        mock_service.get_sessions = AsyncMock(return_value=["default", "test-session"])
        mock_service.create_session = AsyncMock(return_value=True)
        mock_service.session_exists = AsyncMock(return_value=True)
        mock_service.kill_session = AsyncMock(return_value=True)
        mock_service.create_window = AsyncMock(return_value=True)
        mock_service.kill_window = AsyncMock(return_value=True)
        mock_service.get_hierarchy = AsyncMock(return_value={
            "default": {
                "name": "default",
                "windows": {
                    "0": {
                        "name": "bash",
                        "index": "0",
                        "active": True,
                        "pane_count": 1,
                        "panes": {}
                    }
                }
            }
        })
        yield mock_service


@pytest.fixture
def mock_subprocess():
    """Mock asyncio subprocess for unit testing TmuxService"""
    with patch('asyncio.create_subprocess_exec') as mock_exec:
        mock_process = AsyncMock()
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"output", b""))
        mock_exec.return_value = mock_process
        yield mock_exec, mock_process
