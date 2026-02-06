#!/bin/bash
set -e

# Use PORT from environment (Render sets this), default to 10000
PORT="${PORT:-10000}"

echo "Starting API agents-metiers on port $PORT..."

# Start uvicorn with the backend app
exec uvicorn backend.main:app --host 0.0.0.0 --port "$PORT"
