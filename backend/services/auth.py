import os
import logging
from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)

async def get_current_user(authorization: str = Header(None)) -> str:
    """
    Dependency to get the current user ID.
    If CLERK_SECRET_KEY is set, it would verify the token here.
    For now, it acts as a flexible placeholder for easy integration later.
    """
    clerk_key = os.environ.get("CLERK_SECRET_KEY")
    
    if clerk_key and authorization:
        # Placeholder for real Clerk JWT verification
        # Example: jwt.decode(token, clerk_public_key)
        logger.info("Using real Clerk Auth (Verification skipped for placeholder)")
        return "clerk_user_123"
        
    # If no key is set (local dev mode), return a default isolated mock user
    return "mock_local_user@gmail.com"
