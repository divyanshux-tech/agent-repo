import asyncio
import logging
import time
import uuid
from enum import Enum
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class VoiceState(Enum):
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    PROCESSING = "PROCESSING"
    SPEAKING = "SPEAKING"
    INTERRUPTED = "INTERRUPTED"
    ERROR = "ERROR"

class VoiceSession:
    def __init__(self, session_id: str, websocket: WebSocket):
        self.session_id = session_id
        self.websocket = websocket
        self.is_active = True
        self.current_turn_task = None
        
        self.state = VoiceState.IDLE
        self.language = "unknown"
        self.provider = "bhashini"
        self.active_turn_id = None
        
        self.timestamps = {
            "created_at": time.time(),
            "last_active": time.time()
        }
        
    def generate_turn_id(self) -> str:
        self.active_turn_id = str(uuid.uuid4())
        return self.active_turn_id
        
    async def set_state(self, state: VoiceState):
        self.state = state
        await self.send_message({"type": "STATE_CHANGE", "state": state.value})
    
    async def send_message(self, message: dict):
        if self.is_active:
            await self.websocket.send_json(message)
            
    async def cancel_turn(self):
        """Called when user interrupts."""
        self.active_turn_id = None  # Invalidate current turn
        
        if self.state == VoiceState.SPEAKING:
            await self.set_state(VoiceState.INTERRUPTED)
            
        if self.current_turn_task and not self.current_turn_task.done():
            self.current_turn_task.cancel()
            logger.info(f"[{self.session_id}] Turn interrupted and cancelled.")
            await self.send_message({"type": "INTERRUPT_ACKNOWLEDGED"})
            await self.set_state(VoiceState.LISTENING)
