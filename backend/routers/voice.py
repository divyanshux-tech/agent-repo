import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.voice.voice_gateway import VoiceGateway
from services.auth import get_current_user
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Response
import edge_tts

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
    await gateway.connect(websocket, isolated_session_id, user_id=user_id)
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

@router.get("/tts")
async def get_tts_audio(text: str, lang: str = "hi-IN"):
    """
    Generate high-quality Indian female voice using Edge TTS (Azure Neural voices).
    Provides native audio without relying on the browser's limited TTS.
    """
    # Prefer Swara (female) for Hindi/Hinglish, Neerja (female) for English
    voice = "hi-IN-SwaraNeural" if "hi" in lang else "en-IN-NeerjaNeural"
    
    try:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
        
        return Response(content=bytes(audio_data), media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        return Response(content=b"", status_code=500)
