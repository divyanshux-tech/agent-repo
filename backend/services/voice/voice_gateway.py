"""
Voice Gateway — Powered by Gemini 2.0 Flash
- Full Hindi/English/Hinglish understanding
- While speaking, emits show_cards events to render visual catalogue cards
- User can book from voice mode
- Falls back to Groq Whisper ASR + Gemini text if Live API unavailable
"""
import asyncio
import base64
import json
import logging
import os
from typing import Dict, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)

from services.voice.voice_session import VoiceSession, VoiceState

# ── Voice Agent System Prompt ────────────────────────────────────────────────
VOICE_SYSTEM_PROMPT = """You are NuraTravel, an elite Indian AI travel agent. You are speaking to a user via voice.

YOUR PERSONALITY:
- Warm, friendly, and natural — like a helpful friend who knows travel inside out
- You speak naturally in whatever language the user uses: Hindi, English, or Hinglish (mix of both)
- You are concise when speaking aloud (2-4 sentences max per response — this is voice, not text)
- You are PROACTIVE — if the user says "Kerala me ghumna hai", you immediately start suggesting

LANGUAGE RULES:
- User speaks Hindi → Reply in simple Hindi/Hinglish
- User speaks English → Reply in clear English
- User mixes both → Mix naturally, like a real Indian friend
- NEVER say "I am an AI" or "As an AI language model"

YOUR CAPABILITIES (which you actively use):
1. Suggest destinations with enthusiasm ("Kerala bahut sundar hai! Backwaters, Munnar, beach — sab kuch hai!")
2. Search real flights and trains ("Abhi check karti hoon Delhi se Kerala ke flights")
3. Find hotels that match budget ("Teri budget mein bahut acche options hain!")
4. Create day-by-day itineraries ("5 din ka plan banaati hoon")
5. Provide weather info ("October mein Kerala ka weather perfect hota hai!")
6. Help with bookings ("Confirm karna chahte ho? Main abhi booking kar deti hoon")

WHEN TO EMIT ACTIONS (you MUST include these JSON markers in your response):
- When showing places: include [SHOW_CARDS:destination_name] in your response
- When searching flights: include [SEARCH_FLIGHTS:origin:destination:date]  
- When searching hotels: include [SEARCH_HOTELS:destination:date:days:budget]
- When ready to book: include [CONFIRM_BOOKING:trip_id]

EXAMPLE RESPONSES:
User: "Kerala dikhao"
You: "Bilkul! Kerala ek dream destination hai — dekho yahan ke amazing places! [SHOW_CARDS:kerala] Backwaters mein houseboat ride, Munnar ki chai ki khetiyaan, aur Kovalam ka beach — kya acha lagta hai tumhe?"

User: "Show me flights to Goa"
You: "Perfect choice! [SEARCH_FLIGHTS:Delhi:Goa:2024-10-15] Main flights check kar rahi hoon — ek second!"

User: "Book the hotel"
You: "Great! [CONFIRM_BOOKING] Booking confirm karne se pehle — total ₹25,000 hoga, confirm karein?"

CRITICAL RULES:
- Keep voice responses SHORT (2-4 sentences)
- Always sound enthusiastic about travel
- Never make up prices or availability — always trigger a real search action
- Include action markers whenever triggering a backend action
"""


class VoiceGateway:
    def __init__(self):
        self.sessions: Dict[str, VoiceSession] = {}
        self.gemini_key = os.environ.get("GEMINI_API_KEY", "")
        self.groq_key = os.environ.get("GROQ_API_KEY", "")

    async def connect(self, websocket: WebSocket, session_id: str, user_id: Optional[str] = None):
        await websocket.accept()
        session = VoiceSession(session_id, websocket)
        session.user_id = user_id
        session.trip_state = {}
        session.conversation_history = []
        self.sessions[session_id] = session
        logger.info(f"Voice session {session_id} connected (user: {user_id})")
        await session.send_message({
            "type": "CONNECTION_ESTABLISHED",
            "session_id": session_id,
            "message": "NuraTravel voice agent ready. Namaste! Kahan jaana chahte hain?"
        })
        await session.set_state(VoiceState.IDLE)

    def disconnect(self, session_id: str):
        if session_id in self.sessions:
            self.sessions[session_id].is_active = False
            del self.sessions[session_id]

    async def handle_message(self, session_id: str, message: dict):
        if session_id not in self.sessions:
            return

        session = self.sessions[session_id]
        msg_type = message.get("type")

        if msg_type == "AUDIO_CHUNK":
            await session.set_state(VoiceState.LISTENING)
            audio_b64 = message.get("audio_b64", "")
            if not audio_b64:
                return
            audio_data = base64.b64decode(audio_b64)
            transcript = await self._transcribe_audio(audio_data, session)
            if transcript:
                await session.send_message({"type": "TRANSCRIPT_FINAL", "text": transcript})
                await self._process_voice_turn(session, transcript)

        elif msg_type == "TEXT_INPUT":
            text = message.get("text", "")
            await session.send_message({"type": "TRANSCRIPT_FINAL", "text": text})
            await self._process_voice_turn(session, text)

        elif msg_type == "STATE_UPDATE":
            # Frontend can sync trip state to voice session
            if session_id in self.sessions:
                self.sessions[session_id].trip_state = message.get("state", {})

        elif msg_type == "INTERRUPT":
            if session.current_turn_task:
                session.current_turn_task.cancel()
            await session.set_state(VoiceState.IDLE)

    async def _transcribe_audio(self, audio_data: bytes, session: VoiceSession) -> str:
        """Transcribe audio using Groq Whisper (best for Indian accents)"""
        if not self.groq_key:
            logger.warning("No GROQ_API_KEY — cannot transcribe audio")
            return ""
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                files = {"file": ("audio.webm", audio_data, "audio/webm")}
                data = {"model": "whisper-large-v3", "language": "hi"}  # Hindi + English
                headers = {"Authorization": f"Bearer {self.groq_key}"}
                resp = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers=headers, files=files, data=data,
                )
                result = resp.json()
                return result.get("text", "").strip()
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return ""

    async def _process_voice_turn(self, session: VoiceSession, transcript: str):
        """Process a voice turn — get AI response and handle action markers"""
        if session.current_turn_task:
            session.current_turn_task.cancel()
        session.current_turn_task = asyncio.create_task(
            self._run_voice_turn(session, transcript)
        )

    async def _run_voice_turn(self, session: VoiceSession, transcript: str):
        try:
            await session.set_state(VoiceState.PROCESSING)

            # Add user message to history
            session.conversation_history.append({"role": "user", "content": transcript})

            # Get AI response
            response_text = await self._get_gemini_response(
                transcript,
                session.conversation_history[-10:],  # Last 10 turns for context
                session.trip_state,
            )

            if not response_text:
                response_text = "Maafi chahta hoon, kuch gadbad ho gayi. Dobara try karein?"

            # Parse out action markers from response
            clean_text, actions = self._parse_actions(response_text)

            # Add agent response to history
            session.conversation_history.append({"role": "assistant", "content": clean_text})

            # Execute actions (show cards, search, etc.)
            for action in actions:
                await self._execute_action(session, action)

            # Send text response to frontend
            await session.send_message({
                "type": "AGENT_RESPONSE_TEXT",
                "text": clean_text,
                "session_id": session.session_id,
            })

            await session.set_state(VoiceState.SPEAKING)

            # TTS using browser's speech synthesis (send text, frontend handles TTS)
            # This avoids needing a TTS API key — browser's built-in works great
            await session.send_message({
                "type": "TTS_SPEAK",
                "text": clean_text,
                "language": self._detect_language(transcript),
            })

            await session.send_message({"type": "TURN_COMPLETE"})
            await session.set_state(VoiceState.IDLE)

        except asyncio.CancelledError:
            logger.info(f"Turn cancelled for session {session.session_id}")
        except Exception as e:
            logger.error(f"Voice turn error: {e}")
            await session.send_message({"type": "ERROR", "message": str(e)})
            await session.set_state(VoiceState.IDLE)

    async def _get_gemini_response(
        self,
        transcript: str,
        history: list,
        trip_state: dict,
    ) -> str:
        """Get response from Gemini 2.0 Flash with trip context"""
        if not self.gemini_key:
            return "Gemini API key nahi mila. Please check your .env file."

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.gemini_key)

            # Build state context
            state_ctx = ""
            if trip_state:
                dest = trip_state.get("destination", {})
                dest_name = dest.get("canonical_value") if isinstance(dest, dict) else dest
                budget = (trip_state.get("budget") or {}).get("amount")
                days = (trip_state.get("duration_days") or {})
                days_val = days.get("value") if isinstance(days, dict) else days
                if dest_name or budget or days_val:
                    state_ctx = f"\n\nCurrent trip context: destination={dest_name}, days={days_val}, budget=₹{budget}"

            model = genai.GenerativeModel(
                "gemini-2.0-flash",
                system_instruction=VOICE_SYSTEM_PROMPT + state_ctx,
            )

            # Build conversation
            contents = []
            for msg in history[:-1]:  # All but the latest (which we're sending now)
                role = "user" if msg["role"] == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg["content"]}]})

            chat = model.start_chat(history=contents)
            response = await asyncio.to_thread(chat.send_message, transcript)
            return response.text

        except Exception as e:
            logger.error(f"Gemini response failed: {e}")
            return "Kuch technical problem aa gayi. Thodi der baad try karein!"

    def _parse_actions(self, response_text: str) -> tuple[str, list]:
        """Extract [ACTION:params] markers from response text"""
        import re
        actions = []
        
        # Find all action markers
        pattern = r'\[([A-Z_]+)(?::([^\]]*))?\]'
        matches = re.findall(pattern, response_text)
        
        for action_type, params in matches:
            param_list = params.split(":") if params else []
            actions.append({"type": action_type, "params": param_list})
        
        # Clean the text for speaking (remove the markers)
        clean_text = re.sub(pattern, "", response_text).strip()
        clean_text = " ".join(clean_text.split())  # Normalize whitespace
        
        return clean_text, actions

    async def _execute_action(self, session: VoiceSession, action: dict):
        """Execute a parsed voice action"""
        action_type = action["type"]
        params = action["params"]

        if action_type == "SHOW_CARDS":
            destination = params[0] if params else ""
            if destination:
                try:
                    from services.destination_card_service import get_destination_cards
                    cards = await get_destination_cards(destination)
                    await session.send_message({
                        "type": "SHOW_DESTINATION_CARDS",
                        "destination": destination,
                        "cards": cards,
                    })
                except Exception as e:
                    logger.error(f"Failed to get destination cards: {e}")

        elif action_type == "SEARCH_FLIGHTS":
            origin = params[0] if len(params) > 0 else "Delhi"
            dest = params[1] if len(params) > 1 else ""
            date = params[2] if len(params) > 2 else None
            if dest:
                try:
                    from agents.travel_agent import search_travel
                    travel_data = await search_travel(origin, dest, date, 1)
                    await session.send_message({
                        "type": "SHOW_FLIGHT_RESULTS",
                        "flights": travel_data.get("flights", [])[:4],
                        "trains": travel_data.get("trains", [])[:4],
                    })
                except Exception as e:
                    logger.error(f"Flight search failed: {e}")

        elif action_type == "SEARCH_HOTELS":
            dest = params[0] if len(params) > 0 else ""
            date = params[1] if len(params) > 1 else None
            days = int(params[2]) if len(params) > 2 else 3
            budget = int(params[3]) if len(params) > 3 else 100000
            if dest:
                try:
                    from agents.hotel_agent import search_hotels
                    hotels = await search_hotels(dest, date, None, 2, days)
                    await session.send_message({
                        "type": "SHOW_HOTEL_RESULTS",
                        "hotels": hotels[:4],
                    })
                except Exception as e:
                    logger.error(f"Hotel search failed: {e}")

        elif action_type == "CONFIRM_BOOKING":
            await session.send_message({"type": "TRIGGER_BOOKING_FLOW"})

    def _detect_language(self, text: str) -> str:
        hindi_markers = {"mujhe", "mein", "hai", "hoon", "chahiye", "karo", "jaana", "kahan", "dikhao", "kitne", "nahi", "aur", "bahut", "ek", "do"}
        words = set(text.lower().split())
        has_hindi = bool(words & hindi_markers)
        has_english = any(len(w) > 3 and w.isalpha() and w not in hindi_markers for w in words)
        if has_hindi and has_english:
            return "hinglish"
        elif has_hindi:
            return "hi-IN"
        return "en-IN"
