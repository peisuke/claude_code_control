import pytest
from unittest.mock import AsyncMock, patch

from app.services.tmux_service import (
    TmuxService,
    validate_tmux_target,
    validate_tmux_name,
    MAX_TARGET_LENGTH,
    MAX_COMMAND_LENGTH,
)


class TestValidateTmuxTarget:
    """Tests for validate_tmux_target function"""

    def test_valid_simple_session(self):
        assert validate_tmux_target("default") is True
        assert validate_tmux_target("my-session") is True
        assert validate_tmux_target("session_name") is True
        assert validate_tmux_target("session.name") is True

    def test_valid_session_window(self):
        assert validate_tmux_target("session:0") is True
        assert validate_tmux_target("session:window") is True
        assert validate_tmux_target("my-session:my-window") is True

    def test_valid_session_window_pane(self):
        assert validate_tmux_target("session:0.0") is True
        assert validate_tmux_target("session:window.pane") is True
        assert validate_tmux_target("my-session:my-window.0") is True

    def test_invalid_empty(self):
        assert validate_tmux_target("") is False
        assert validate_tmux_target(None) is False

    def test_invalid_special_characters(self):
        assert validate_tmux_target("session;rm -rf /") is False
        assert validate_tmux_target("session`whoami`") is False
        assert validate_tmux_target("session$(id)") is False
        assert validate_tmux_target("session|cat") is False
        assert validate_tmux_target("session&echo") is False

    def test_invalid_too_long(self):
        long_name = "a" * (MAX_TARGET_LENGTH + 1)
        assert validate_tmux_target(long_name) is False

    def test_valid_at_max_length(self):
        max_name = "a" * MAX_TARGET_LENGTH
        assert validate_tmux_target(max_name) is True


class TestValidateTmuxName:
    """Tests for validate_tmux_name function"""

    def test_valid_names(self):
        assert validate_tmux_name("default") is True
        assert validate_tmux_name("my-session") is True
        assert validate_tmux_name("session_name") is True
        assert validate_tmux_name("Session123") is True

    def test_invalid_empty(self):
        assert validate_tmux_name("") is False
        assert validate_tmux_name(None) is False

    def test_invalid_special_characters(self):
        assert validate_tmux_name("name:colon") is False
        assert validate_tmux_name("name;semicolon") is False
        assert validate_tmux_name("name`backtick") is False
        assert validate_tmux_name("name$dollar") is False

    def test_invalid_too_long(self):
        long_name = "a" * (MAX_TARGET_LENGTH + 1)
        assert validate_tmux_name(long_name) is False


class TestTmuxService:
    """Tests for TmuxService class"""

    @pytest.fixture
    def service(self):
        return TmuxService()

    @pytest.mark.asyncio
    async def test_send_command_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0

        result = await service.send_command("ls -la", "default")

        assert result is True
        mock_exec.assert_called()

    @pytest.mark.asyncio
    async def test_send_command_invalid_target(self, service):
        result = await service.send_command("ls", "invalid;target")

        assert result is False

    @pytest.mark.asyncio
    async def test_send_command_too_long(self, service):
        long_command = "a" * (MAX_COMMAND_LENGTH + 1)

        result = await service.send_command(long_command, "default")

        assert result is False

    @pytest.mark.asyncio
    async def test_send_command_no_target(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0

        result = await service.send_command("ls")

        assert result is False

    @pytest.mark.asyncio
    async def test_send_enter_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0

        result = await service.send_enter("default")

        assert result is True

    @pytest.mark.asyncio
    async def test_send_enter_invalid_target(self, service):
        result = await service.send_enter("invalid`target")

        assert result is False

    @pytest.mark.asyncio
    async def test_get_output_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"terminal output", b""))

        # Mock session_exists to return True
        with patch.object(service, 'session_exists', AsyncMock(return_value=True)):
            result = await service.get_output("default")

        assert result == "terminal output"

    @pytest.mark.asyncio
    async def test_get_output_invalid_target(self, service):
        result = await service.get_output("invalid;target")

        assert "Error: Invalid target format" in result

    @pytest.mark.asyncio
    async def test_get_output_session_not_found(self, service, mock_subprocess):
        with patch.object(service, 'session_exists', AsyncMock(return_value=False)):
            result = await service.get_output("nonexistent")

        assert result == "Session not found"

    @pytest.mark.asyncio
    async def test_get_output_with_history(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"history output", b""))

        with patch.object(service, 'session_exists', AsyncMock(return_value=True)):
            result = await service.get_output("default", include_history=True)

        assert result == "history output"
        # Verify -S flag was used
        call_args = mock_exec.call_args[0]
        assert "-S" in call_args

    @pytest.mark.asyncio
    async def test_get_output_with_lines(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"limited output", b""))

        with patch.object(service, 'session_exists', AsyncMock(return_value=True)):
            result = await service.get_output("default", include_history=True, lines=500)

        assert result == "limited output"
        # Verify lines flag was used
        call_args = mock_exec.call_args[0]
        assert "-500" in call_args

    @pytest.mark.asyncio
    async def test_get_sessions_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"default\ntest-session\n", b""))

        result = await service.get_sessions()

        assert result == ["default", "test-session"]

    @pytest.mark.asyncio
    async def test_get_sessions_empty(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 1
        mock_process.communicate = AsyncMock(return_value=(b"", b"no server running"))

        result = await service.get_sessions()

        assert result == []

    @pytest.mark.asyncio
    async def test_create_session_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0

        result = await service.create_session("new-session")

        assert result is True

    @pytest.mark.asyncio
    async def test_create_session_invalid_name(self, service):
        result = await service.create_session("invalid;name")

        assert result is False

    @pytest.mark.asyncio
    async def test_session_exists_true(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0

        result = await service.session_exists("default")

        assert result is True

    @pytest.mark.asyncio
    async def test_session_exists_false(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 1

        result = await service.session_exists("nonexistent")

        assert result is False

    @pytest.mark.asyncio
    async def test_session_exists_invalid_name(self, service):
        result = await service.session_exists("invalid;name")

        assert result is False

    @pytest.mark.asyncio
    async def test_kill_session_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0

        result = await service.kill_session("test-session")

        assert result is True

    @pytest.mark.asyncio
    async def test_kill_session_invalid_name(self, service):
        result = await service.kill_session("invalid;name")

        assert result is False

    @pytest.mark.asyncio
    async def test_get_windows_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"0|bash|1|1\n1|vim|0|1\n", b""))

        result = await service.get_windows("default")

        assert len(result) == 2
        assert result[0]["index"] == "0"
        assert result[0]["name"] == "bash"
        assert result[0]["active"] is True
        assert result[1]["index"] == "1"
        assert result[1]["name"] == "vim"
        assert result[1]["active"] is False

    @pytest.mark.asyncio
    async def test_get_windows_invalid_session(self, service):
        result = await service.get_windows("invalid;session")

        assert result == []

    @pytest.mark.asyncio
    async def test_get_panes_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"0|1|bash|80x24\n", b""))

        result = await service.get_panes("default", "0")

        assert len(result) == 1
        assert result[0]["index"] == "0"
        assert result[0]["active"] is True
        assert result[0]["command"] == "bash"
        assert result[0]["size"] == "80x24"

    @pytest.mark.asyncio
    async def test_get_panes_invalid_session(self, service):
        result = await service.get_panes("invalid;session")

        assert result == []

    @pytest.mark.asyncio
    async def test_create_window_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0

        result = await service.create_window("default", "new-window")

        assert result is True

    @pytest.mark.asyncio
    async def test_create_window_without_name(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0

        result = await service.create_window("default")

        assert result is True

    @pytest.mark.asyncio
    async def test_create_window_invalid_session(self, service):
        result = await service.create_window("invalid;session")

        assert result is False

    @pytest.mark.asyncio
    async def test_create_window_invalid_window_name(self, service):
        result = await service.create_window("default", "invalid;window")

        assert result is False

    @pytest.mark.asyncio
    async def test_kill_window_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0

        result = await service.kill_window("default", "0")

        assert result is True

    @pytest.mark.asyncio
    async def test_kill_window_invalid_session(self, service):
        result = await service.kill_window("invalid;session", "0")

        assert result is False

    @pytest.mark.asyncio
    async def test_kill_window_invalid_window(self, service):
        result = await service.kill_window("default", "invalid;window")

        assert result is False

    @pytest.mark.asyncio
    async def test_get_hierarchy_success(self, service, mock_subprocess):
        mock_exec, mock_process = mock_subprocess
        mock_process.returncode = 0

        # Mock the necessary methods
        with patch.object(service, 'get_sessions', AsyncMock(return_value=["default"])):
            with patch.object(service, 'get_windows', AsyncMock(return_value=[
                {"index": "0", "name": "bash", "active": True, "pane_count": 1}
            ])):
                with patch.object(service, 'get_panes', AsyncMock(return_value=[
                    {"index": "0", "active": True, "command": "bash", "size": "80x24"}
                ])):
                    result = await service.get_hierarchy()

        assert "default" in result
        assert result["default"]["name"] == "default"
        assert "0" in result["default"]["windows"]

