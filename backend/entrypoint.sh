#!/bin/bash
set -e

# Fix tmux socket directory permissions.
# When Docker auto-creates the volume mount dir it is owned by root,
# but tmux requires the socket directory to be owned by the running user
# with mode 0700.
APP_UID=$(id -u appuser)
APP_GID=$(id -g appuser)
TMUX_DIR="/tmp/tmux-${APP_UID}"
mkdir -p "$TMUX_DIR"
chown "${APP_UID}:${APP_GID}" "$TMUX_DIR"
chmod 700 "$TMUX_DIR"

# Create default tmux session as appuser
DEFAULT_SESSION="${TMUX_DEFAULT_SESSION:-main}"
WORKSPACE="${WORKSPACE_DIR:-/home/appuser}"
if ! gosu appuser tmux has-session -t "$DEFAULT_SESSION" 2>/dev/null; then
    gosu appuser tmux new-session -d -s "$DEFAULT_SESSION" -c "$WORKSPACE"
    echo "Created default tmux session: $DEFAULT_SESSION (cwd: $WORKSPACE)"
fi

# Drop privileges and exec the CMD
exec gosu appuser "$@"
