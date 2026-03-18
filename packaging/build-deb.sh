#!/bin/bash
set -euo pipefail

# Build .deb package for Claude Code Control
# Usage: ./packaging/build-deb.sh [version]
#   version defaults to git describe or "0.1.0"
#
# The package ships source + requirements.txt only.
# The venv is created on the target machine during postinst,
# so any Python 3.10+ works regardless of build environment.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION="${1:-$(git -C "$PROJECT_DIR" describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "0.1.0")}"
ARCH="all"  # no compiled code — pure Python, arch-independent
BUILD_DIR="$(mktemp -d)"
INSTALL_DIR="$BUILD_DIR/opt/claude-code-control"

trap "rm -rf '$BUILD_DIR'" EXIT

echo "=== Building claude-code-control ${VERSION} (${ARCH}) ==="

# 1. Copy backend source and requirements
echo "--- Copying backend source ---"
mkdir -p "$INSTALL_DIR/backend"
rsync -a --exclude='__pycache__' "$PROJECT_DIR/backend/app/" "$INSTALL_DIR/backend/app/"
touch "$INSTALL_DIR/backend/__init__.py"
cp "$PROJECT_DIR/backend/requirements.txt" "$INSTALL_DIR/requirements.txt"

# 2. Build with fpm
echo "--- Building .deb ---"
fpm \
    --input-type dir \
    --output-type deb \
    --name claude-code-control \
    --version "$VERSION" \
    --architecture "$ARCH" \
    --description "Claude Code Control - tmux controller backend (FastAPI)" \
    --url "https://github.com/peisuke/claude_code_control" \
    --license MIT \
    --depends tmux \
    --depends "python3 >= 3.10" \
    --depends python3-venv \
    --deb-systemd "$SCRIPT_DIR/claude-code-control.service" \
    --after-install "$SCRIPT_DIR/postinst" \
    --before-remove "$SCRIPT_DIR/prerm" \
    --after-remove "$SCRIPT_DIR/postrm" \
    --config-files /etc/claude-code-control/config.env \
    --package "$PROJECT_DIR/" \
    "$INSTALL_DIR/=/opt/claude-code-control/" \
    "$SCRIPT_DIR/config.env=/etc/claude-code-control/config.env"

DEB_FILE="$PROJECT_DIR/claude-code-control_${VERSION}_${ARCH}.deb"
echo ""
echo "=== Done ==="
echo "Package: $DEB_FILE"
echo "Install: sudo dpkg -i $DEB_FILE"
echo "Size:    $(du -h "$DEB_FILE" | cut -f1)"
