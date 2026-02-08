"""Simple in-memory rate limiting middleware."""

import time
from collections import defaultdict
from fastapi import Request, HTTPException, status
from typing import Dict, Tuple
import threading


class RateLimiter:
    """
    Simple in-memory rate limiter using sliding window.

    ⚠️ NOTE: This is a basic implementation suitable for single-instance deployments.
    For production with multiple instances, use Redis-backed rate limiting.
    """

    def __init__(self):
        # Store: {key: [(timestamp, count), ...]}
        self._requests: Dict[str, list] = defaultdict(list)
        self._lock = threading.Lock()

    def _clean_old_requests(self, key: str, window: int) -> None:
        """Remove requests older than the time window."""
        current_time = time.time()
        cutoff = current_time - window
        with self._lock:
            self._requests[key] = [
                (ts, count) for ts, count in self._requests[key] if ts > cutoff
            ]

    def is_allowed(
        self, key: str, max_requests: int, window: int = 60
    ) -> Tuple[bool, int]:
        """
        Check if request is allowed under rate limit.

        Args:
            key: Unique identifier (IP, user_id, etc.)
            max_requests: Maximum requests allowed in window
            window: Time window in seconds (default 60)

        Returns:
            Tuple of (is_allowed, requests_remaining)
        """
        self._clean_old_requests(key, window)

        current_time = time.time()

        with self._lock:
            # Count requests in current window
            request_count = sum(count for _, count in self._requests[key])

            if request_count >= max_requests:
                return False, 0

            # Add current request
            self._requests[key].append((current_time, 1))
            return True, max_requests - request_count - 1


# Global rate limiter instance
rate_limiter = RateLimiter()


async def rate_limit_middleware(
    request: Request, max_requests: int = 100, window: int = 60
):
    """
    Rate limiting middleware.

    Args:
        request: FastAPI request object
        max_requests: Maximum requests per window
        window: Time window in seconds

    Raises:
        HTTPException 429 if rate limit exceeded
    """
    # Use IP address as rate limit key
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"ip:{client_ip}"

    # Check rate limit
    is_allowed, remaining = rate_limiter.is_allowed(
        rate_limit_key, max_requests, window
    )

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {max_requests} requests per {window} seconds.",
            headers={"Retry-After": str(window)},
        )

    # Add rate limit headers
    request.state.rate_limit_remaining = remaining


async def login_rate_limit(request: Request):
    """
    Strict rate limit for login endpoint (5 requests per 15 minutes).

    Protects against brute force attacks.
    Uses IP-based limiting to prevent password guessing.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"login:ip:{client_ip}"

    # 5 requests per 15 minutes (900 seconds)
    is_allowed, remaining = rate_limiter.is_allowed(rate_limit_key, 5, 900)

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again in 15 minutes.",
            headers={"Retry-After": "900"},
        )

    request.state.login_attempts_remaining = remaining
