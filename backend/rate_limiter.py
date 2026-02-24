"""
Simple in-memory rate limiter for API endpoints.
Thread-safe with Lock.
"""
import time
import threading
from collections import defaultdict
from fastapi import HTTPException


class RateLimiter:
    """In-memory rate limiter using sliding window (thread-safe)."""

    def __init__(self):
        # key -> list of timestamps
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def check(self, key: str, max_requests: int, window_seconds: int = 3600):
        """
        Check if request is allowed. Raises 429 if limit exceeded.

        Args:
            key: Identifier (e.g. endpoint name or IP+endpoint)
            max_requests: Max requests in window
            window_seconds: Window size in seconds (default 1 hour)
        """
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            # Clean old entries
            self._requests[key] = [t for t in self._requests[key] if t > cutoff]

            if len(self._requests[key]) >= max_requests:
                remaining = int(self._requests[key][0] + window_seconds - now)
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded: max {max_requests} requests per hour. "
                           f"Try again in {remaining} seconds."
                )

            self._requests[key].append(now)


# Global instance
rate_limiter = RateLimiter()
