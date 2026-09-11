import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

async def get_current_user(token: Optional[str] = None) -> str:
    """
    Resolve user_id from a bearer token string.
    Accepts the raw token value (not a Header DI dependency).
    Works for both WebSocket (query param token) and HTTP (Authorization header).
    """
    if not token:
        return "anonymous_user"

    clerk_key = os.environ.get("CLERK_SECRET_KEY")
    if not clerk_key:
        # Local dev: derive a stable user ID from token so sessions are isolated
        return f"dev_user_{token[:8]}" if len(token) >= 8 else "dev_user"

    # TODO: Replace with real Clerk JWT verification
    # from clerk_backend_api import Clerk
    # clerk = Clerk(bearer_auth=clerk_key)
    # claims = clerk.verify_token(token)
    # return claims["sub"]
    
    logger.info(f"Auth: token received, Clerk verification is a placeholder")
    return f"clerk_user_{token[:12]}"
