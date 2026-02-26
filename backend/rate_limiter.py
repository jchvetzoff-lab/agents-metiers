"""
Persistent rate limiter backed by SQLite.
Survives app restarts. Thread-safe via SQLite's built-in locking.
Falls back to in-memory if DB unavailable.
"""
import os
import time
import sqlite3
import logging
import threading
from collections import defaultdict
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class PersistentRateLimiter:
    """SQLite-backed rate limiter using sliding window."""

    def __init__(self, db_path: str = None):
        if db_path is None:
            # Use same data directory as main DB
            data_dir = os.getenv("DATA_DIR", "data")
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, "rate_limiter.db")

        self._db_path = db_path
        self._fallback = False
        # In-memory fallback (used during tests or if DB fails)
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

        try:
            self._init_db()
        except Exception as e:
            logger.warning(f"Rate limiter DB init failed, using in-memory fallback: {e}")
            self._fallback = True

    def _init_db(self):
        """Create the rate_limit_requests table if it doesn't exist."""
        with sqlite3.connect(self._db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS rate_limit_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT NOT NULL,
                    timestamp REAL NOT NULL
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_rate_limit_key_ts
                ON rate_limit_requests (key, timestamp)
            """)
            conn.commit()

    def _get_conn(self) -> sqlite3.Connection:
        """Get a SQLite connection."""
        return sqlite3.connect(self._db_path, timeout=5)

    def check(self, key: str, max_requests: int, window_seconds: int = 3600):
        """
        Check if request is allowed. Raises 429 if limit exceeded.

        Args:
            key: Identifier (e.g. endpoint name or IP+endpoint)
            max_requests: Max requests in window
            window_seconds: Window size in seconds (default 1 hour)
        """
        if self._fallback:
            return self._check_memory(key, max_requests, window_seconds)

        try:
            return self._check_db(key, max_requests, window_seconds)
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Rate limiter DB error, falling back to memory: {e}")
            return self._check_memory(key, max_requests, window_seconds)

    def _check_db(self, key: str, max_requests: int, window_seconds: int):
        """Check rate limit using SQLite."""
        now = time.time()
        cutoff = now - window_seconds

        with self._get_conn() as conn:
            # Clean old entries for this key
            conn.execute(
                "DELETE FROM rate_limit_requests WHERE key = ? AND timestamp <= ?",
                (key, cutoff)
            )

            # Count recent requests
            row = conn.execute(
                "SELECT COUNT(*) FROM rate_limit_requests WHERE key = ? AND timestamp > ?",
                (key, cutoff)
            ).fetchone()
            count = row[0] if row else 0

            if count >= max_requests:
                # Get oldest timestamp to compute retry time
                oldest = conn.execute(
                    "SELECT MIN(timestamp) FROM rate_limit_requests WHERE key = ? AND timestamp > ?",
                    (key, cutoff)
                ).fetchone()
                remaining = int((oldest[0] if oldest and oldest[0] else now) + window_seconds - now)
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded: max {max_requests} requests per hour. "
                           f"Try again in {remaining} seconds."
                )

            # Record this request
            conn.execute(
                "INSERT INTO rate_limit_requests (key, timestamp) VALUES (?, ?)",
                (key, now)
            )
            conn.commit()

    def _check_memory(self, key: str, max_requests: int, window_seconds: int):
        """Fallback: in-memory rate limiting (same as before)."""
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            self._requests[key] = [t for t in self._requests[key] if t > cutoff]

            if len(self._requests[key]) >= max_requests:
                remaining = int(self._requests[key][0] + window_seconds - now)
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded: max {max_requests} requests per hour. "
                           f"Try again in {remaining} seconds."
                )

            self._requests[key].append(now)

    def cleanup(self):
        """Periodically clean up old entries from DB. Call from startup/cron."""
        if self._fallback:
            return
        try:
            cutoff = time.time() - 7200  # Clean entries older than 2 hours
            with self._get_conn() as conn:
                result = conn.execute(
                    "DELETE FROM rate_limit_requests WHERE timestamp <= ?",
                    (cutoff,)
                )
                conn.commit()
                if result.rowcount > 0:
                    logger.info(f"Rate limiter cleanup: removed {result.rowcount} old entries")
        except Exception as e:
            logger.warning(f"Rate limiter cleanup failed: {e}")


# Global instance
rate_limiter = PersistentRateLimiter()
