#!/bin/bash
set -euo pipefail

# Use PORT from environment (Render sets this), default to 10000
PORT="${PORT:-10000}"

echo "Starting API agents-metiers on port $PORT..."

# Validate port is numeric
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    echo "Error: PORT must be numeric, got: $PORT"
    exit 1
fi

# Start uvicorn with the backend app
exec uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --access-log \
    --use-colors
