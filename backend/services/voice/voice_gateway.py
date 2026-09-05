import asyncio
import logging
from typing import Dict
from fastapi import WebSocket

logger = logging.getLogger(__name__)

from services.voice.voice_session import VoiceSession, VoiceState
from services.voice.provider_manager import ProviderManager

class VoiceGateway:
    def __init__(self):
        self.sessions: Dict[str, VoiceSession] = {}
        self.provider_manager = ProviderManager()
        
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        session = VoiceSession(session_id, websocket)
        self.sessions[session_id] = session
        logger.info(f"Voice Session {session_id} connected")
        await session.send_message({"type": "CONNECTION_ESTABLISHED", "session_id": session_id})
        await session.set_state(VoiceState.IDLE)
        
    def disconnect(self, session_id: str):
        if session_id in self.sessions:
            self.sessions[session_id].is_active = False
            del self.sessions[session_id]
            logger.info(f"Voice Session {session_id} disconnected")
            
    async def handle_message(self, session_id: str, message: dict):
        if session_id not in self.sessions:
            return
            
        session = self.sessions[session_id]
        msg_type = message.get("type")
        
        if msg_type == "AUDIO_CHUNK":
            await session.set_state(VoiceState.LISTENING)
            # 1. Process audio via ASR
            asr_result = await self.provider_manager.get_asr_result(b"audio") # Mock
            
            # Send interim transcript back
            await session.send_message({
                "type": "TRANSCRIPT_INTERIM", 
                "session_id": session.session_id,
                "text": asr_result["text"]
            })
            
            # If final, process turn
            if asr_result.get("is_final", True): # Assume final for mock
                await self._process_turn(session, asr_result["text"])
                
        elif msg_type == "TEXT_INPUT":
            # Directly process text (bypass ASR)
            text = message.get("text", "")
            await session.send_message({
                "type": "TRANSCRIPT_FINAL", 
                "session_id": session.session_id,
                "text": text
            })
            await self._process_turn(session, text)
                
        elif msg_type == "INTERRUPT":
            await session.cancel_turn()
            
        else:
            logger.warning(f"[{session_id}] Unknown message type: {msg_type}")

    async def _process_turn(self, session: VoiceSession, transcript: str):
        turn_id = session.generate_turn_id()
        session.current_turn_task = asyncio.create_task(self._run_turn(session, turn_id, transcript))
        
    async def _run_turn(self, session: VoiceSession, turn_id: str, transcript: str):
        try:
            from services.voice.telemetry import VoiceTelemetry
            telemetry = VoiceTelemetry(session.session_id, turn_id)
            telemetry.mark("asr_final")
            
            await session.set_state(VoiceState.PROCESSING)
            
            # 2. Parallel Latency Architecture
            from services.conversation.intent_parser import IntentParser
            from services.voice.language_service import LanguageService
            from services.memory.memory_retriever import MemoryRetriever
            
            parser = IntentParser()
            lang_service = LanguageService()
            memory = MemoryRetriever()
            
            telemetry.mark("memory_start")
            telemetry.mark("orchestrator_start")
            
            # Fire all three tasks in parallel
            parsed_task = asyncio.create_task(parser.parse_turn(transcript))
            lang_task = asyncio.create_task(lang_service.detect_language(transcript))
            memory_task = asyncio.create_task(memory.retrieve_context(session.session_id, transcript))
            
            parsed, lang_result, context = await asyncio.gather(parsed_task, lang_task, memory_task)
            
            language = lang_result.get("language", "hinglish")
            
            # 3. Ambiguity Check and Geocoding
            from services.conversation.ambiguity_manager import AmbiguityManager
            ambiguity = AmbiguityManager()
            
            entities = parsed.get("entities", {})
            # Geocode locations if present
            for loc_key in ["destination", "origin"]:
                loc = entities.get(loc_key)
                if loc and "raw" in loc:
                    entities[loc_key].update(ambiguity.resolve_geocoding(loc["raw"]))
                    
            clarifications = ambiguity.evaluate_entities(entities, context)
            
            # 4. Response Formatting (Skip Orchestrator for this basic mock)
            response_text = "Main check kar raha hoon." if not clarifications else clarifications[0]
            
            from services.conversation.response_formatter import ResponseFormatter
            formatter = ResponseFormatter()
            spoken_chunks = formatter.format_for_voice(response_text, language)
            
            telemetry.mark("llm_first_token")
            await session.set_state(VoiceState.SPEAKING)
            
            first_audio_marked = False
            telemetry.mark("tts_start")
            
            for chunk in spoken_chunks:
                if session.active_turn_id != turn_id:
                    logger.warning(f"Dropping stale response for turn {turn_id}")
                    return
                
                # Send text chunk to UI
                await session.send_message({
                    "type": "AGENT_RESPONSE_TEXT", 
                    "session_id": session.session_id,
                    "turn_id": turn_id,
                    "text": chunk
                })
                
                # TTS
                audio = await self.provider_manager.get_tts_result(chunk, language)
                
                # Send audio chunk back
                await session.send_message({
                    "type": "AGENT_AUDIO_CHUNK", 
                    "session_id": session.session_id,
                    "turn_id": turn_id,
                    "audio_b64": "mock_base64"
                })
                
                if not first_audio_marked:
                    telemetry.mark("tts_first_audio")
                    first_audio_marked = True
                
            await session.send_message({"type": "TURN_COMPLETE"})
            await session.set_state(VoiceState.IDLE)
            telemetry.log_report()
            
        except asyncio.CancelledError:
            logger.info("Turn processing was cancelled by user interruption.")
        except Exception as e:
            logger.error(f"Error processing turn: {e}")
            await session.send_message({"type": "ERROR", "message": str(e)})
