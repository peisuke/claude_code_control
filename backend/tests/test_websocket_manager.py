"""Tests for WebSocket connection manager"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.websocket.manager import ConnectionManager


class TestConnectionManager:
    """Tests for ConnectionManager class"""

    @pytest.fixture
    def manager(self):
        """Create a fresh ConnectionManager for each test"""
        return ConnectionManager()

    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket"""
        ws = AsyncMock()
        ws.accept = AsyncMock()
        ws.send_text = AsyncMock()
        return ws

    @pytest.mark.asyncio
    async def test_connect_new_session(self, manager, mock_websocket):
        """Test connecting a websocket to a new session"""
        await manager.connect(mock_websocket, "test-session")

        mock_websocket.accept.assert_called_once()
        assert "test-session" in manager.active_connections
        assert mock_websocket in manager.active_connections["test-session"]

    @pytest.mark.asyncio
    async def test_connect_existing_session(self, manager, mock_websocket):
        """Test connecting multiple websockets to same session"""
        ws1 = AsyncMock()
        ws1.accept = AsyncMock()
        ws2 = AsyncMock()
        ws2.accept = AsyncMock()

        await manager.connect(ws1, "session1")
        await manager.connect(ws2, "session1")

        assert len(manager.active_connections["session1"]) == 2
        assert ws1 in manager.active_connections["session1"]
        assert ws2 in manager.active_connections["session1"]

    @pytest.mark.asyncio
    async def test_connect_requires_session_name(self, manager, mock_websocket):
        """Test that connect requires a session name argument"""
        import inspect
        sig = inspect.signature(manager.connect)
        param = sig.parameters['session_name']
        assert param.default is inspect.Parameter.empty

    def test_disconnect_existing_connection(self, manager, mock_websocket):
        """Test disconnecting an existing connection"""
        # Manually add connection
        manager.active_connections["test-session"] = [mock_websocket]

        manager.disconnect(mock_websocket, "test-session")

        assert "test-session" not in manager.active_connections

    def test_disconnect_nonexistent_session(self, manager, mock_websocket):
        """Test disconnecting from non-existent session"""
        # Should not raise an error
        manager.disconnect(mock_websocket, "nonexistent")
        assert "nonexistent" not in manager.active_connections

    def test_disconnect_nonexistent_websocket(self, manager, mock_websocket):
        """Test disconnecting websocket not in session"""
        other_ws = AsyncMock()
        manager.active_connections["test-session"] = [other_ws]

        # Should not raise an error
        manager.disconnect(mock_websocket, "test-session")
        assert other_ws in manager.active_connections["test-session"]

    def test_disconnect_removes_empty_session(self, manager, mock_websocket):
        """Test that empty sessions are cleaned up after disconnect"""
        manager.active_connections["test-session"] = [mock_websocket]

        manager.disconnect(mock_websocket, "test-session")

        assert "test-session" not in manager.active_connections

    def test_has_connections_for_session_true(self, manager, mock_websocket):
        """Test has_connections_for_session returns True when connections exist"""
        manager.active_connections["test-session"] = [mock_websocket]

        assert manager.has_connections_for_session("test-session") is True

    def test_has_connections_for_session_false_empty(self, manager):
        """Test has_connections_for_session returns False for empty session"""
        manager.active_connections["test-session"] = []

        assert manager.has_connections_for_session("test-session") is False

    def test_has_connections_for_session_false_nonexistent(self, manager):
        """Test has_connections_for_session returns False for non-existent session"""
        assert manager.has_connections_for_session("nonexistent") is False

    @pytest.mark.asyncio
    async def test_send_personal_message_success(self, manager, mock_websocket):
        """Test sending personal message successfully"""
        manager.active_connections["test-session"] = [mock_websocket]

        await manager.send_personal_message("Hello", mock_websocket, "test-session")

        mock_websocket.send_text.assert_called_once_with("Hello")

    @pytest.mark.asyncio
    async def test_send_personal_message_error_disconnects(self, manager, mock_websocket):
        """Test that send error disconnects the websocket"""
        mock_websocket.send_text.side_effect = Exception("Connection closed")
        manager.active_connections["test-session"] = [mock_websocket]

        await manager.send_personal_message("Hello", mock_websocket, "test-session")

        # Connection should be removed after error
        assert mock_websocket not in manager.active_connections.get("test-session", [])

    @pytest.mark.asyncio
    async def test_broadcast_to_session_success(self, manager):
        """Test broadcasting to all connections in a session"""
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        manager.active_connections["test-session"] = [ws1, ws2]

        await manager.broadcast_to_session("test-session", "broadcast message")

        ws1.send_text.assert_called_once_with("broadcast message")
        ws2.send_text.assert_called_once_with("broadcast message")

    @pytest.mark.asyncio
    async def test_broadcast_to_session_nonexistent(self, manager):
        """Test broadcasting to non-existent session does nothing"""
        # Should not raise an error
        await manager.broadcast_to_session("nonexistent", "message")

    @pytest.mark.asyncio
    async def test_broadcast_to_session_removes_failed_connections(self, manager):
        """Test that failed connections are removed during broadcast"""
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        ws2.send_text.side_effect = Exception("Connection closed")
        manager.active_connections["test-session"] = [ws1, ws2]

        await manager.broadcast_to_session("test-session", "message")

        # ws1 should still be connected, ws2 should be removed
        assert ws1 in manager.active_connections["test-session"]
        assert ws2 not in manager.active_connections["test-session"]

    @pytest.mark.asyncio
    async def test_broadcast_all_sessions(self, manager):
        """Test broadcasting to all sessions"""
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        manager.active_connections["session1"] = [ws1]
        manager.active_connections["session2"] = [ws2]

        await manager.broadcast("global message")

        ws1.send_text.assert_called_once_with("global message")
        ws2.send_text.assert_called_once_with("global message")

    def test_get_total_connections_empty(self, manager):
        """Test get_total_connections with no connections"""
        assert manager.get_total_connections() == 0

    def test_get_total_connections_single_session(self, manager, mock_websocket):
        """Test get_total_connections with one session"""
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        manager.active_connections["session1"] = [ws1, ws2]

        assert manager.get_total_connections() == 2

    def test_get_total_connections_multiple_sessions(self, manager):
        """Test get_total_connections with multiple sessions"""
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        ws3 = AsyncMock()
        manager.active_connections["session1"] = [ws1, ws2]
        manager.active_connections["session2"] = [ws3]

        assert manager.get_total_connections() == 3
