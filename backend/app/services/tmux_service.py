import asyncio
import logging
import os
import re
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

# Regex pattern for valid tmux target names
# Allows: alphanumeric, dash, underscore, dot, colon (for target separators)
TMUX_TARGET_PATTERN = re.compile(r'^[a-zA-Z0-9_\-\.]+(?::[a-zA-Z0-9_\-\.]+)?(?:\.[a-zA-Z0-9_\-\.]+)?$')
TMUX_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9_\-\.]+$')
MAX_TARGET_LENGTH = 128
MAX_COMMAND_LENGTH = 4096


def validate_tmux_target(target: str) -> bool:
    """Validate tmux target format (session, session:window, session:window.pane)"""
    if not target or len(target) > MAX_TARGET_LENGTH:
        return False
    return bool(TMUX_TARGET_PATTERN.match(target))


def validate_tmux_name(name: str) -> bool:
    """Validate tmux session or window name"""
    if not name or len(name) > MAX_TARGET_LENGTH:
        return False
    return bool(TMUX_NAME_PATTERN.match(name))


class TmuxService:
    def __init__(self):
        socket_path = os.environ.get("TMUX_SOCKET_PATH")
        if socket_path and not os.path.isabs(socket_path):
            logger.warning(f"TMUX_SOCKET_PATH must be absolute, ignoring: {socket_path}")
            socket_path = None
        self._socket_path = socket_path

    async def _execute_tmux_command(self, cmd: List[str]) -> Tuple[Optional[str], Optional[str], int]:
        """Execute a tmux command and return (stdout, stderr, returncode).

        Returns decoded stdout/stderr strings and the process return code.
        If TMUX_SOCKET_PATH is set, injects -S <path> into the command.
        """
        if self._socket_path and cmd and cmd[0] == "tmux":
            cmd = [cmd[0], "-S", self._socket_path, *cmd[1:]]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        return (
            stdout.decode() if stdout else None,
            stderr.decode() if stderr else None,
            process.returncode
        )

    async def send_command(self, command: str, target: str = None) -> bool:
        """Send a command to tmux target (session, window, or pane)"""

        if not validate_tmux_target(target):
            logger.warning(f"Invalid tmux target format: {target}")
            return False

        if len(command) > MAX_COMMAND_LENGTH:
            logger.warning(f"Command too long: {len(command)} chars")
            return False

        try:
            _, _, returncode = await self._execute_tmux_command(
                ["tmux", "send-keys", "-t", target, command]
            )
            return returncode == 0
        except Exception as e:
            logger.error(f"Error sending command: {e}")
            return False

    async def send_enter(self, target: str = None) -> bool:
        """Send Enter key to tmux target"""

        if not validate_tmux_target(target):
            logger.warning(f"Invalid tmux target format: {target}")
            return False

        try:
            _, _, returncode = await self._execute_tmux_command(
                ["tmux", "send-keys", "-t", target, "Enter"]
            )
            return returncode == 0
        except Exception as e:
            logger.error(f"Error sending enter: {e}")
            return False

    async def resize_pane(self, target: str, cols: int, rows: int) -> bool:
        """Resize tmux pane to match frontend terminal dimensions"""
        if not validate_tmux_target(target):
            logger.warning(f"Invalid tmux target format: {target}")
            return False

        # Clamp to reasonable bounds
        cols = max(20, min(cols, 500))
        rows = max(24, min(rows, 200))

        try:
            _, stderr, returncode = await self._execute_tmux_command(
                ["tmux", "resize-window", "-t", target, "-x", str(cols), "-y", str(rows)]
            )

            if returncode != 0:
                logger.error(f"Failed to resize pane: {stderr}")
                return False

            return True
        except Exception as e:
            logger.error(f"Error resizing pane: {e}")
            return False

    async def get_output(self, target: str = None, include_history: bool = False, lines: int = None) -> str:
        """Get current tmux target output, optionally including scrollback history"""

        if not validate_tmux_target(target):
            logger.warning(f"Invalid tmux target format: {target}")
            return "Error: Invalid target format"

        try:
            session_name = target.split(':')[0] if ':' in target else target
            if not await self.session_exists(session_name):
                return "Session not found"

            if include_history:
                if lines:
                    cmd = ["tmux", "capture-pane", "-t", target, "-e", "-p", "-S", f"-{lines}"]
                else:
                    cmd = ["tmux", "capture-pane", "-t", target, "-e", "-p", "-S", "-"]
            else:
                cmd = ["tmux", "capture-pane", "-t", target, "-e", "-p"]

            stdout, stderr, returncode = await self._execute_tmux_command(cmd)

            if returncode == 0:
                return (stdout or "").rstrip('\n')
            else:
                return f"Error: {stderr or 'unknown error'}"

        except Exception as e:
            return f"Error getting output: {e}"

    async def get_sessions(self) -> List[str]:
        """Get list of tmux sessions"""
        try:
            stdout, _, returncode = await self._execute_tmux_command(
                ["tmux", "list-sessions", "-F", "#{session_name}"]
            )

            if returncode == 0 and stdout:
                sessions = stdout.strip().split('\n')
                return [s for s in sessions if s]
            else:
                return []

        except Exception as e:
            logger.error(f"Error getting sessions: {e}")
            return []

    async def create_session(self, session: str) -> bool:
        """Create a new tmux session starting in the user's home directory"""
        if not validate_tmux_name(session):
            logger.warning(f"Invalid tmux session name: {session}")
            return False

        try:
            home_dir = os.path.expanduser('~')
            _, stderr, returncode = await self._execute_tmux_command(
                ["tmux", "new-session", "-d", "-s", session, "-c", home_dir]
            )

            if returncode != 0:
                logger.warning(f"tmux new-session failed: {stderr}")

            return returncode == 0

        except Exception as e:
            logger.error(f"Error creating session: {e}")
            return False

    async def session_exists(self, session: str) -> bool:
        """Check if tmux session exists"""
        if not validate_tmux_name(session):
            return False

        try:
            _, _, returncode = await self._execute_tmux_command(
                ["tmux", "has-session", "-t", session]
            )
            return returncode == 0
        except Exception as e:
            return False

    async def get_windows(self, session: str) -> List[Dict[str, Any]]:
        """Get list of windows in a tmux session"""
        if not validate_tmux_name(session):
            logger.warning(f"Invalid session name: {session}")
            return []

        try:
            stdout, stderr, returncode = await self._execute_tmux_command(
                ["tmux", "list-windows", "-t", session, "-F",
                 "#{window_index}|#{window_name}|#{window_active}|#{window_panes}"]
            )

            if returncode == 0 and stdout:
                windows = []
                for line in stdout.strip().split('\n'):
                    if line.strip():
                        parts = line.split('|')
                        if len(parts) >= 4:
                            windows.append({
                                'index': parts[0],
                                'name': parts[1],
                                'active': parts[2] == '1',
                                'pane_count': int(parts[3]) if parts[3].isdigit() else 1
                            })
                return windows
            else:
                logger.warning(f"Error listing windows: {stderr}")
                return []

        except Exception as e:
            logger.error(f"Error getting windows: {e}")
            return []

    async def get_panes(self, session: str, window: str = None) -> List[Dict[str, Any]]:
        """Get list of panes in a tmux window"""
        if not validate_tmux_name(session):
            logger.warning(f"Invalid session name: {session}")
            return []
        if window and not validate_tmux_name(window):
            logger.warning(f"Invalid window name: {window}")
            return []

        try:
            target = f"{session}:{window}" if window else session
            stdout, stderr, returncode = await self._execute_tmux_command(
                ["tmux", "list-panes", "-t", target, "-F",
                 "#{pane_index}|#{pane_active}|#{pane_current_command}|#{pane_width}x#{pane_height}"]
            )

            if returncode == 0 and stdout:
                panes = []
                for line in stdout.strip().split('\n'):
                    if line.strip():
                        parts = line.split('|')
                        if len(parts) >= 4:
                            panes.append({
                                'index': parts[0],
                                'active': parts[1] == '1',
                                'command': parts[2],
                                'size': parts[3] if len(parts) > 3 else 'unknown'
                            })
                return panes
            else:
                logger.warning(f"Error listing panes: {stderr}")
                return []

        except Exception as e:
            logger.error(f"Error getting panes: {e}")
            return []

    async def kill_session(self, session: str) -> bool:
        """Kill a tmux session"""
        if not validate_tmux_name(session):
            logger.warning(f"Invalid session name: {session}")
            return False

        try:
            _, _, returncode = await self._execute_tmux_command(
                ["tmux", "kill-session", "-t", session]
            )
            return returncode == 0
        except Exception as e:
            logger.error(f"Error killing session: {e}")
            return False

    async def create_window(self, session: str, window_name: str = None) -> bool:
        """Create a new window in a tmux session"""
        if not validate_tmux_name(session):
            logger.warning(f"Invalid session name: {session}")
            return False
        if window_name and not validate_tmux_name(window_name):
            logger.warning(f"Invalid window name: {window_name}")
            return False

        try:
            cmd = ["tmux", "new-window", "-d", "-t", f"{session}:"]
            if window_name:
                cmd.extend(["-n", window_name])

            _, stderr, returncode = await self._execute_tmux_command(cmd)

            if returncode != 0:
                logger.warning(f"tmux new-window failed: {stderr}")

            return returncode == 0

        except Exception as e:
            logger.error(f"Error creating window: {e}")
            return False

    async def kill_window(self, session: str, window_index: str) -> bool:
        """Kill a window in a tmux session"""
        if not validate_tmux_name(session):
            logger.warning(f"Invalid session name: {session}")
            return False
        if not validate_tmux_name(window_index):
            logger.warning(f"Invalid window index: {window_index}")
            return False

        try:
            target = f"{session}:{window_index}"
            _, _, returncode = await self._execute_tmux_command(
                ["tmux", "kill-window", "-t", target]
            )
            return returncode == 0
        except Exception as e:
            logger.error(f"Error killing window: {e}")
            return False

    async def get_hierarchy(self) -> Dict[str, Any]:
        """Get complete tmux hierarchy (sessions -> windows -> panes)"""
        try:
            sessions = await self.get_sessions()
            hierarchy = {}

            logger.debug(f"Found {len(sessions)} sessions: {sessions}")

            for session in sessions:
                logger.debug(f"Processing session: {session}")

                windows = await self.get_windows(session)
                logger.debug(f"Found {len(windows)} windows in session {session}")

                session_data = {
                    'name': session,
                    'windows': {}
                }

                for window in windows:
                    logger.debug(f"Processing window {window['index']}: {window['name']}")

                    panes = await self.get_panes(session, window['index'])
                    logger.debug(f"Found {len(panes)} panes in window {window['index']}")

                    session_data['windows'][window['index']] = {
                        'name': window['name'],
                        'index': window['index'],
                        'active': window['active'],
                        'pane_count': window.get('pane_count', len(panes)),
                        'panes': {pane['index']: {
                            'index': pane['index'],
                            'active': pane['active'],
                            'command': pane['command'],
                            'size': pane.get('size', 'unknown')
                        } for pane in panes}
                    }

                hierarchy[session] = session_data

            logger.debug(f"Final hierarchy structure: {list(hierarchy.keys())}")
            return hierarchy

        except Exception as e:
            logger.error(f"Error getting hierarchy: {e}")
            return {}
