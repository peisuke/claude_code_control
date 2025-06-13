import asyncio
import subprocess
from typing import List, Optional, Dict, Any
from datetime import datetime


class TmuxService:
    def __init__(self):
        self.default_session = "default"
    
    async def send_command(self, command: str, target: str = None) -> bool:
        """Send a command to tmux target (session, window, or pane)"""
        target = target or self.default_session
        
        try:
            # Parse target to check if session exists
            session_name = target.split(':')[0] if ':' in target else target
            if not await self.session_exists(session_name):
                await self.create_session(session_name)
            
            # Send command to tmux target
            cmd = ["tmux", "send-keys", "-t", target, command]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            return process.returncode == 0
            
        except Exception as e:
            print(f"Error sending command: {e}")
            return False
    
    async def send_enter(self, target: str = None) -> bool:
        """Send Enter key to tmux target"""
        target = target or self.default_session
        
        try:
            session_name = target.split(':')[0] if ':' in target else target
            if not await self.session_exists(session_name):
                await self.create_session(session_name)
            
            cmd = ["tmux", "send-keys", "-t", target, "Enter"]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            return process.returncode == 0
            
        except Exception as e:
            print(f"Error sending enter: {e}")
            return False
    
    async def get_output(self, target: str = None) -> str:
        """Get current tmux target output"""
        target = target or self.default_session
        
        try:
            session_name = target.split(':')[0] if ':' in target else target
            if not await self.session_exists(session_name):
                return "Session not found"
            
            cmd = ["tmux", "capture-pane", "-t", target, "-e", "-p"]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                return stdout.decode()
            else:
                return f"Error: {stderr.decode()}"
                
        except Exception as e:
            return f"Error getting output: {e}"
    
    async def get_sessions(self) -> List[str]:
        """Get list of tmux sessions"""
        try:
            cmd = ["tmux", "list-sessions", "-F", "#{session_name}"]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                sessions = stdout.decode().strip().split('\n')
                return [s for s in sessions if s]
            else:
                return []
                
        except Exception as e:
            print(f"Error getting sessions: {e}")
            return []
    
    async def create_session(self, session: str) -> bool:
        """Create a new tmux session"""
        try:
            cmd = ["tmux", "new-session", "-d", "-s", session]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            return process.returncode == 0
            
        except Exception as e:
            print(f"Error creating session: {e}")
            return False
    
    async def session_exists(self, session: str) -> bool:
        """Check if tmux session exists"""
        try:
            cmd = ["tmux", "has-session", "-t", session]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            return process.returncode == 0
            
        except Exception as e:
            return False
    
    async def get_windows(self, session: str) -> List[Dict[str, Any]]:
        """Get list of windows in a tmux session"""
        try:
            # Use pipe separator to avoid conflicts with colons in window names
            cmd = ["tmux", "list-windows", "-t", session, "-F", "#{window_index}|#{window_name}|#{window_active}|#{window_panes}"]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                windows = []
                for line in stdout.decode().strip().split('\n'):
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
                print(f"Error listing windows: {stderr.decode()}")
                return []
                
        except Exception as e:
            print(f"Error getting windows: {e}")
            return []
    
    async def get_panes(self, session: str, window: str = None) -> List[Dict[str, Any]]:
        """Get list of panes in a tmux window"""
        try:
            target = f"{session}:{window}" if window else session
            # Use pipe separator to avoid conflicts with colons in commands
            cmd = ["tmux", "list-panes", "-t", target, "-F", "#{pane_index}|#{pane_active}|#{pane_current_command}|#{pane_width}x#{pane_height}"]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                panes = []
                for line in stdout.decode().strip().split('\n'):
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
                print(f"Error listing panes: {stderr.decode()}")
                return []
                
        except Exception as e:
            print(f"Error getting panes: {e}")
            return []
    
    async def kill_session(self, session: str) -> bool:
        """Kill a tmux session"""
        try:
            cmd = ["tmux", "kill-session", "-t", session]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            return process.returncode == 0
            
        except Exception as e:
            print(f"Error killing session: {e}")
            return False
    
    async def create_window(self, session: str, window_name: str = None) -> bool:
        """Create a new window in a tmux session"""
        try:
            cmd = ["tmux", "new-window", "-t", session]
            if window_name:
                cmd.extend(["-n", window_name])
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            return process.returncode == 0
            
        except Exception as e:
            print(f"Error creating window: {e}")
            return False
    
    async def kill_window(self, session: str, window_index: str) -> bool:
        """Kill a window in a tmux session"""
        try:
            target = f"{session}:{window_index}"
            cmd = ["tmux", "kill-window", "-t", target]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            return process.returncode == 0
            
        except Exception as e:
            print(f"Error killing window: {e}")
            return False

    async def get_hierarchy(self) -> Dict[str, Any]:
        """Get complete tmux hierarchy (sessions -> windows -> panes)"""
        try:
            sessions = await self.get_sessions()
            hierarchy = {}
            
            print(f"Found {len(sessions)} sessions: {sessions}")
            
            for session in sessions:
                print(f"Processing session: {session}")
                
                windows = await self.get_windows(session)
                print(f"Found {len(windows)} windows in session {session}: {[w['name'] for w in windows]}")
                
                session_data = {
                    'name': session,
                    'windows': {}
                }
                
                for window in windows:
                    print(f"Processing window {window['index']}: {window['name']}")
                    
                    panes = await self.get_panes(session, window['index'])
                    print(f"Found {len(panes)} panes in window {window['index']}")
                    
                    # Store window data with proper structure
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
            
            print(f"Final hierarchy structure: {hierarchy}")
            return hierarchy
            
        except Exception as e:
            print(f"Error getting hierarchy: {e}")
            return {}