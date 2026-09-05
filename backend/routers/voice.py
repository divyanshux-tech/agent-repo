import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.voice.voice_gateway import VoiceGateway

router = APIRouter()
logger = logging.getLogger(__name__)

gateway = VoiceGateway()

@router.websocket("/ws/{session_id}")
async def voice_websocket_endpoint(websocket: WebSocket, session_id: str):
    await gateway.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await gateway.handle_message(session_id, message)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from {session_id}")
    except WebSocketDisconnect:
        gateway.disconnect(session_id)
