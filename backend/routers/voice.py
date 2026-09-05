import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.voice.voice_gateway import VoiceGateway
from services.auth import get_current_user
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

router = APIRouter()
logger = logging.getLogger(__name__)

gateway = VoiceGateway()

@router.websocket("/ws/{session_id}")
async def voice_websocket_endpoint(websocket: WebSocket, session_id: str, token: str = Query(None)):
    user_id = await get_current_user(token)
    
    # Ensure the user exists in the local database to satisfy foreign key constraints
    try:
        from db.supabase_client import get_supabase
        get_supabase().table("users").upsert({"id": user_id}).execute()
    except Exception as e:
        logger.error(f"Failed to upsert user {user_id}: {e}")
        
    isolated_session_id = f"{user_id}::{session_id}"
    await gateway.connect(websocket, isolated_session_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await gateway.handle_message(isolated_session_id, message)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from {isolated_session_id}")
    except WebSocketDisconnect:
        gateway.disconnect(isolated_session_id)
