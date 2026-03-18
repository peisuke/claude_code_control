#!/bin/bash
set -euo pipefail

# Build .deb package for Claude Code Control
# Usage: ./packaging/build-deb.sh [version]
#   version defaults to git describe or "0.1.0"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION="${1:-$(git -C "$PROJECT_DIR" describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "0.1.0")}"
ARCH="$(dpkg --print-architecture)"
BUILD_DIR="$(mktemp -d)"
INSTALL_DIR="$BUILD_DIR/opt/claude-code-control"

echo "=== Building claude-code-control ${VERSION} (${ARCH}) ==="

# 1. Create venv and install dependencies
echo "--- Creating venv and installing dependencies ---"
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip --quiet
"$INSTALL_DIR/venv/bin/pip" install -r "$PROJECT_DIR/backend/requirements.txt" --quiet

# 2. Copy backend source
echo "--- Copying backend source ---"
mkdir -p "$INSTALL_DIR/backend"
rsync -a --exclude='__pycache__' "$PROJECT_DIR/backend/app/" "$INSTALL_DIR/backend/app/"
touch "$INSTALL_DIR/backend/__init__.py"

# 3. Build with fpm
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
    --deb-systemd "$SCRIPT_DIR/claude-code-control.service" \
    --after-install "$SCRIPT_DIR/postinst" \
    --before-remove "$SCRIPT_DIR/prerm" \
    --after-remove "$SCRIPT_DIR/postrm" \
    --config-files /etc/claude-code-control/config.env \
    --package "$PROJECT_DIR/" \
    "$INSTALL_DIR/=/opt/claude-code-control/" \
    "$SCRIPT_DIR/config.env=/etc/claude-code-control/config.env"

# 4. Cleanup
rm -rf "$BUILD_DIR"

DEB_FILE="$PROJECT_DIR/claude-code-control_${VERSION}_${ARCH}.deb"
echo ""
echo "=== Done ==="
echo "Package: $DEB_FILE"
echo "Install: sudo dpkg -i $DEB_FILE"
echo "Size:    $(du -h "$DEB_FILE" | cut -f1)"
