# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only (no git — SHA injected at build time)
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Build-time args for git version (avoids needing git in production image)
ARG GIT_SHA=unknown
ARG GIT_MSG=
ENV GIT_SHA=$GIT_SHA
ENV GIT_MSG=$GIT_MSG

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Make entrypoint executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create non-root user for security
RUN addgroup --gid 1001 --system app && \
    adduser --no-create-home --shell /bin/false --disabled-password --uid 1001 --system --group app
RUN chown -R app:app /app
USER app

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:10000/health', timeout=3)" || exit 1

# Use entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
