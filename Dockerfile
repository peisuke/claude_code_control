# Stage 1: Build frontend
FROM node:18-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Backend only (use --target backend to skip frontend build)
FROM python:3.11-slim AS backend

ARG HOST_UID=1000
ARG HOST_GID=1000
ARG TMUX_VERSION=

# Install tmux: build from source if TMUX_VERSION is specified, otherwise use apt
RUN apt-get update && \
    if [ -n "$TMUX_VERSION" ]; then \
        apt-get install -y --no-install-recommends \
            build-essential libevent-dev libncurses5-dev bison pkg-config curl ca-certificates && \
        curl -fsSL "https://github.com/tmux/tmux/releases/download/${TMUX_VERSION}/tmux-${TMUX_VERSION}.tar.gz" \
            -o /tmp/tmux.tar.gz && \
        tar -xzf /tmp/tmux.tar.gz -C /tmp && \
        cd /tmp/tmux-${TMUX_VERSION} && \
        ./configure && make && make install && \
        cd / && rm -rf /tmp/tmux* && \
        apt-get purge -y build-essential bison pkg-config curl ca-certificates && \
        apt-get autoremove -y; \
    else \
        apt-get install -y --no-install-recommends tmux; \
    fi && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user matching host UID/GID
RUN groupadd -g ${HOST_GID} appgroup && \
    useradd -u ${HOST_UID} -g appgroup -m -s /bin/bash appuser

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

ENV PYTHONUNBUFFERED=1

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Stage 3: Full app (backend + frontend)
FROM backend AS app

COPY --from=frontend-build /app/frontend/build ./frontend/build
ENV STATIC_DIR=/app/frontend/build
