import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.voice.gemini_live_gateway import GeminiLiveGateway
from services.voice.voice_gateway import VoiceGateway
from services.auth import get_current_user
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Response
from fastapi.responses import StreamingResponse
import edge_tts
import os
import httpx

router = APIRouter()
logger = logging.getLogger(__name__)

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
# Default ElevenLabs Voice ID (Sarah or any good female voice)
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")

gateway = GeminiLiveGateway()  # replaces VoiceGateway()

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
    # If ElevenLabs API Key is provided, use it for hyper-realistic human voice
    if ELEVENLABS_API_KEY:
        try:
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}/stream"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY
            }
            data = {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=data, headers=headers, timeout=15.0)
                if response.status_code == 200:
                    return Response(content=response.content, media_type="audio/mpeg")
                else:
                    logger.error(f"ElevenLabs Error: {response.text}")
        except Exception as e:
            logger.error(f"ElevenLabs TTS failed, falling back to Edge TTS: {e}")

    # High-quality Indian female voice
    # en-IN-NeerjaExpressiveNeural provides emotional warmth and natural conversational intonation for Hinglish/English
    # hi-IN-SwaraNeural for Hindi
    if "hi" in lang.lower() and "en" not in lang.lower():
        voice = "hi-IN-SwaraNeural"
    else:
        voice = "en-IN-NeerjaExpressiveNeural"
    
    async def audio_stream():
        try:
            # Natural speed (+0%) and natural pitch (no pitch shift) to avoid metallic/robotic artifacts
            communicate = edge_tts.Communicate(text, voice, rate="+0%", pitch="+0Hz")
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        except Exception as e:
            logger.error(f"TTS stream error: {e}")

    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )
