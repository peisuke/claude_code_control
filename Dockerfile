# Stage 1: Build frontend
FROM node:18-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime
FROM python:3.11-slim

ARG HOST_UID=1000
ARG HOST_GID=1000

# Install tmux and curl (curl for healthcheck)
RUN apt-get update && \
    apt-get install -y --no-install-recommends tmux && \
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

# Copy frontend build from stage 1
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Set environment
ENV STATIC_DIR=/app/frontend/build
ENV PYTHONUNBUFFERED=1

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
