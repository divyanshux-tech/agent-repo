"""
Voice Gateway — Production-grade, Context-Aware, Tool-Calling Voice Agent
==========================================================================
- Powered by Gemini 2.0 Flash for natural Hinglish / Hindi / English replies
- Groq Whisper for ASR (best Indian accent accuracy)
- Connected to full NLU orchestrator pipeline (same as text chat)
- Real tool calls: flights, trains, hotels, destination cards, itinerary
- Human-like thinking phrases BEFORE fetching ("Ek second, dekh rahi hoon...")
- Full per-session conversation memory + trip state (context-aware)
- Language auto-detection → hi-IN / en-IN / hinglish
- Streams TRANSCRIPT_INTERIM for live chat display
- After every tool result → emits TTS + cards to chat panel simultaneously
"""

import asyncio
import base64
import json
import logging
import os
import re
import random
from typing import Dict, Optional, List

from fastapi import WebSocket

logger = logging.getLogger(__name__)

from services.voice.voice_session import VoiceSession, VoiceState

# ──────────────────────────────────────────────────────────────────────────────
# Persona + System Prompt (Female Indian travel expert)
# ──────────────────────────────────────────────────────────────────────────────
VOICE_SYSTEM_PROMPT = """You are Nura, an elite Indian AI travel expert. You speak like a warm, witty Indian woman who loves travel.
You are currently in a VOICE conversation — be concise and natural.

PERSONALITY:
- Warm and enthusiastic about travel, like a helpful dost (friend)
- You mix Hindi/Hinglish naturally: "Bilkul!", "Haan!", "Wah!", "Shukriya!"
- You NEVER sound robotic. You use fillers: "dekho", "acha", "theek hai", "haan bolo"
- 2-4 sentences max per voice response — this is spoken audio, not text
- You PROACTIVELY guide: if someone says "Kerala", you immediately suggest things

LANGUAGE RULES:
- User speaks Hindi → reply in Hindi/Hinglish
- User speaks English → reply in clear English
- User mixes both → mix naturally like a real Indian
- NEVER say "As an AI" or "I am a language model"

YOUR CAPABILITIES (call these in your responses using JSON markers):
1. Show destination place cards
2. Search real flights and trains
3. Find hotels matching budget
4. Generate day-by-day itinerary
5. Answer destination knowledge questions
6. Check weather

WHEN TO EMIT TOOL CALLS — embed JSON markers in your response text:
- Showing places: [SHOW_CARDS:destination_name]
- Searching flights+trains: [SEARCH_TRAVEL:origin:destination]
- Searching hotels: [SEARCH_HOTELS:destination:days:budget]
- Generating itinerary: [GENERATE_ITINERARY:destination:days:budget]
- Fetching knowledge/hidden gems: [FETCH_KNOWLEDGE:destination:query]

EXAMPLE RESPONSES:
User: "Kerala dikhao"
You: "Bilkul! Kerala ek bahut hi sundar jagah hai! [SHOW_CARDS:kerala] Yahan backwaters mein houseboat ride, Munnar ki chai ke baagaan, Kovalam beach — sab kuch hai! Aapko kitne din ke liye jaana hai?"

User: "Delhi se Goa flights dikhao"
You: "Haan, abhi check karti hoon! [SEARCH_TRAVEL:delhi:goa] Ek second rukiye, best options dhundh rahi hoon aapke liye!"

User: "Mujhe Kerala ke hidden gems batao"
You: "Ooh, hidden gems! [FETCH_KNOWLEDGE:kerala:hidden gems] Yeh soch ke hi excited ho gayi! Dekho kya nikal ke aata hai..."

User: "7 din ka itinerary bana do Kerala ka"
You: "Perfect! [GENERATE_ITINERARY:kerala:7:30000] Ek ekdum detailed plan bana rahi hoon aapke liye — din by din, jagah by jagah!"

CRITICAL RULES:
- NEVER make up prices, flight numbers, or hotel names
- Always trigger real searches with markers
- Keep it SHORT and conversational for voice
- Be enthusiastic about travel — make the user excited!
"""

# ──────────────────────────────────────────────────────────────────────────────
# Human-like thinking phrases (emitted BEFORE long fetch operations)
# ──────────────────────────────────────────────────────────────────────────────
THINKING_PHRASES_HI = [
    "Ek second... main abhi dekhti hoon!",
    "Haan, ruko ek minute — best options dhundh rahi hoon!",
    "Bilkul! Abhi fetch kar rahi hoon, do second!",
    "Acha, search kar rahi hoon — ek pal!",
    "Ji haan, main abhi check karti hoon!",
]

THINKING_PHRASES_EN = [
    "One moment, searching the best options for you!",
    "Let me find that for you right now!",
    "Searching... just a second!",
    "Give me a moment to fetch the best results!",
]

RESULT_PHRASES_HI = [
    "Maine results fetch kar liye! Yeh dekho —",
    "Ho gaya! Yeh raha aapka result —",
    "Perfect! Yeh rahi sari information —",
    "Mil gaya! Is side mein dekho —",
]

RESULT_PHRASES_EN = [
    "Got the results! Take a look —",
    "Here's what I found for you!",
    "Done! Check this out —",
]

# ──────────────────────────────────────────────────────────────────────────────
# Airline name map
# ──────────────────────────────────────────────────────────────────────────────
AIRLINE_NAMES = {
    "6E": "IndiGo", "AI": "Air India", "UK": "Vistara",
    "SG": "SpiceJet", "G8": "Go First", "I5": "Air Asia India",
    "IX": "Air India Express", "QP": "Akasa Air",
}


class VoiceGateway:
    def __init__(self):
        self.sessions: Dict[str, VoiceSession] = {}
        self.gemini_key = os.environ.get("GEMINI_API_KEY", "")
        self.groq_key = os.environ.get("GROQ_API_KEY", "")

    # ──────────────────────────────────────────────────────────────────────────
    # Connection management
    # ──────────────────────────────────────────────────────────────────────────
    async def connect(self, websocket: WebSocket, session_id: str, user_id: Optional[str] = None):
        await websocket.accept()
        session = VoiceSession(session_id, websocket)
        session.user_id = user_id
        session.trip_state = {}
        session.conversation_history = []
        session.detected_language = "hinglish"
        self.sessions[session_id] = session

        logger.info(f"Voice session {session_id} connected (user: {user_id})")

        # Send warm welcome
        welcome_text = "Namaste! Main Nura hoon, aapki AI travel expert. Aaj kahan jaana chahte hain?"
        await session.send_message({
            "type": "CONNECTION_ESTABLISHED",
            "session_id": session_id,
            "message": welcome_text,
        })
        await session.set_state(VoiceState.IDLE)

        # Speak the welcome via TTS
        await session.send_message({
            "type": "TTS_SPEAK",
            "text": welcome_text,
            "language": "hi-IN",
        })

    def disconnect(self, session_id: str):
        if session_id in self.sessions:
            self.sessions[session_id].is_active = False
            del self.sessions[session_id]

    # ──────────────────────────────────────────────────────────────────────────
    # Message router
    # ──────────────────────────────────────────────────────────────────────────
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

            # Emit interim transcript immediately so UI shows "Listening..."
            await session.send_message({"type": "TRANSCRIPT_INTERIM", "text": "..."})

            transcript = await self._transcribe_audio(audio_data, session)
            if transcript and transcript.strip():
                # Show final transcript in chat panel
                await session.send_message({"type": "TRANSCRIPT_FINAL", "text": transcript})
                await self._process_voice_turn(session, transcript)
            else:
                await session.send_message({
                    "type": "ERROR_MESSAGE",
                    "text": "Kuch sunai nahi diya — dobara bolein?",
                })
                await session.set_state(VoiceState.IDLE)

        elif msg_type == "TEXT_INPUT":
            # Text fallback in voice mode
            text = message.get("text", "").strip()
            if text:
                await session.send_message({"type": "TRANSCRIPT_FINAL", "text": text})
                await self._process_voice_turn(session, text)

        elif msg_type == "STATE_UPDATE":
            # Frontend syncs trip state (e.g., after sidebar search)
            session.trip_state.update(message.get("state", {}))

        elif msg_type == "INTERRUPT":
            if session.current_turn_task and not session.current_turn_task.done():
                session.current_turn_task.cancel()
            await session.set_state(VoiceState.IDLE)
            await session.send_message({"type": "INTERRUPT_ACKNOWLEDGED"})

        elif msg_type == "PING":
            await session.send_message({"type": "PONG"})

    # ──────────────────────────────────────────────────────────────────────────
    # ASR — Groq Whisper (best for Indian accents)
    # ──────────────────────────────────────────────────────────────────────────
    async def _transcribe_audio(self, audio_data: bytes, session: VoiceSession) -> str:
        if not self.groq_key:
            logger.warning("No GROQ_API_KEY — cannot transcribe audio")
            return ""
        try:
            import httpx
            async with httpx.AsyncClient(timeout=15.0) as client:
                files = {"file": ("audio.webm", audio_data, "audio/webm")}
                # language=None lets Whisper auto-detect (handles Hindi/English/Hinglish)
                data = {"model": "whisper-large-v3", "response_format": "verbose_json"}
                headers = {"Authorization": f"Bearer {self.groq_key}"}
                resp = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers=headers, files=files, data=data,
                )
                result = resp.json()
                # verbose_json gives us language too
                lang = result.get("language", "")
                text = result.get("text", "").strip()
                if lang:
                    detected = self._map_whisper_language(lang)
                    session.detected_language = detected
                    await session.send_message({"type": "LANGUAGE_DETECTED", "language": detected})
                return text
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return ""

    def _map_whisper_language(self, lang: str) -> str:
        """Map Whisper language code to our TTS language tag."""
        lang = lang.lower()
        if lang in ("hi", "hindi"):
            return "hi-IN"
        if lang in ("en", "english"):
            return "en-IN"
        return "hinglish"  # mixed

    # ──────────────────────────────────────────────────────────────────────────
    # Main voice turn processor
    # ──────────────────────────────────────────────────────────────────────────
    async def _process_voice_turn(self, session: VoiceSession, transcript: str):
        """Cancel any in-flight turn and start a new one."""
        if session.current_turn_task and not session.current_turn_task.done():
            session.current_turn_task.cancel()
            try:
                await session.current_turn_task
            except asyncio.CancelledError:
                pass

        session.current_turn_task = asyncio.create_task(
            self._run_voice_turn(session, transcript)
        )

    async def _run_voice_turn(self, session: VoiceSession, transcript: str):
        try:
            await session.set_state(VoiceState.PROCESSING)

            # ── Step 1: NLU — understand intent ──────────────────────────────
            intent_data = await self._run_nlu(session, transcript)
            action = intent_data.get("action", "UNKNOWN")
            lang = intent_data.get("language", session.detected_language or "hinglish")

            # ── Step 2: Get Gemini voice response (with action markers) ───────
            response_text = await self._get_gemini_response(
                transcript=transcript,
                history=session.conversation_history[-12:],
                trip_state=session.trip_state,
                intent_action=action,
            )

            if not response_text:
                response_text = "Maafi chahti hoon, kuch technical gadbad ho gayi. Dobara try karein?"

            # ── Step 3: Parse action markers from response ────────────────────
            clean_text, actions = self._parse_actions(response_text)

            # Update conversation history
            session.conversation_history.append({"role": "user", "content": transcript})
            session.conversation_history.append({"role": "assistant", "content": clean_text})

            # ── Step 4: Speak the response text immediately (low latency) ─────
            await session.set_state(VoiceState.SPEAKING)
            await session.send_message({
                "type": "AGENT_RESPONSE_TEXT",
                "text": clean_text,
                "session_id": session.session_id,
                "language": lang,
            })
            await session.send_message({
                "type": "TTS_SPEAK",
                "text": clean_text,
                "language": self._tts_language(lang),
            })

            # ── Step 5: Execute tool actions (fetch + show cards) ─────────────
            if actions:
                await self._execute_actions(session, actions, lang)

            await session.send_message({"type": "TURN_COMPLETE"})
            await session.set_state(VoiceState.IDLE)

        except asyncio.CancelledError:
            logger.info(f"Turn cancelled for session {session.session_id}")
        except Exception as e:
            logger.error(f"Voice turn error: {e}", exc_info=True)
            err_text = "Kuch problem aa gayi! Ek minute mein dobara try karein."
            await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": err_text, "language": "hinglish"})
            await session.send_message({"type": "TTS_SPEAK", "text": err_text, "language": "hi-IN"})
            await session.set_state(VoiceState.IDLE)

    # ──────────────────────────────────────────────────────────────────────────
    # NLU — run through the same orchestrator pipeline as text chat
    # ──────────────────────────────────────────────────────────────────────────
    async def _run_nlu(self, session: VoiceSession, transcript: str) -> dict:
        try:
            from agents.orchestrator import handle_turn
            from models.chat import Message

            history_msgs = [
                Message(role=m["role"], content=m["content"])
                for m in session.conversation_history[-8:]
            ]

            result = await handle_turn(
                message=transcript,
                history=history_msgs,
                user_id=getattr(session, "user_id", None),
                trip_id=session.trip_state.get("trip_id"),
                language=session.detected_language or "hi",
                current_state=session.trip_state,
            )

            # Merge updated state back into session
            if result.updated_state:
                session.trip_state.update(result.updated_state)
                if result.trip_id:
                    session.trip_state["trip_id"] = result.trip_id

            return {
                "action": result.action,
                "intent": result.intent,
                "language": result.language,
                "updated_state": result.updated_state,
            }
        except Exception as e:
            logger.warning(f"NLU pipeline error (non-fatal): {e}")
            return {"action": "UNKNOWN", "language": session.detected_language or "hinglish"}

    # ──────────────────────────────────────────────────────────────────────────
    # Gemini voice response
    # ──────────────────────────────────────────────────────────────────────────
    async def _get_gemini_response(
        self,
        transcript: str,
        history: list,
        trip_state: dict,
        intent_action: str = "UNKNOWN",
    ) -> str:
        if not self.gemini_key:
            return "Gemini API key missing. Please check your configuration."

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.gemini_key)

            # Build context string from trip state
            state_ctx = self._build_state_context(trip_state, intent_action)

            model = genai.GenerativeModel(
                "gemini-2.0-flash",
                system_instruction=VOICE_SYSTEM_PROMPT + state_ctx,
            )

            # Build conversation contents (excluding current turn)
            contents = []
            for msg in history[:-1] if history else []:
                role = "user" if msg.get("role") == "user" else "model"
                content = msg.get("content", "")
                if content:
                    contents.append({"role": role, "parts": [{"text": content}]})

            chat = model.start_chat(history=contents)
            response = await asyncio.to_thread(chat.send_message, transcript)
            return response.text.strip()

        except Exception as e:
            logger.error(f"Gemini response error: {e}")
            return "Kuch technical problem aa gayi. Thodi der baad try karein!"

    def _build_state_context(self, trip_state: dict, intent_action: str) -> str:
        if not trip_state:
            return ""
        parts = []
        dest = trip_state.get("destination", {})
        dest_name = dest.get("canonical_value") if isinstance(dest, dict) else dest
        budget_obj = trip_state.get("budget", {})
        budget = budget_obj.get("amount") if isinstance(budget_obj, dict) else budget_obj
        days_obj = trip_state.get("duration_days", {})
        days = days_obj.get("value") if isinstance(days_obj, dict) else days_obj
        origin_obj = trip_state.get("origin", {})
        origin = origin_obj.get("canonical_value") if isinstance(origin_obj, dict) else origin_obj

        if dest_name:
            parts.append(f"destination={dest_name}")
        if origin:
            parts.append(f"origin={origin}")
        if days:
            parts.append(f"days={days}")
        if budget:
            parts.append(f"budget=₹{budget}")

        ctx = ""
        if parts:
            ctx = f"\n\nCURRENT TRIP CONTEXT: {', '.join(parts)}"
        if intent_action not in ("UNKNOWN", ""):
            ctx += f"\nUSER INTENT: {intent_action}"
        return ctx

    # ──────────────────────────────────────────────────────────────────────────
    # Parse [ACTION:param1:param2] markers from Gemini response
    # ──────────────────────────────────────────────────────────────────────────
    def _parse_actions(self, response_text: str) -> tuple[str, list]:
        actions = []
        pattern = r'\[([A-Z_]+)(?::([^\]]*))?\]'
        matches = re.findall(pattern, response_text)

        for action_type, params_str in matches:
            params = [p.strip() for p in params_str.split(":")] if params_str else []
            actions.append({"type": action_type, "params": params})

        clean_text = re.sub(pattern, "", response_text).strip()
        clean_text = " ".join(clean_text.split())
        return clean_text, actions

    # ──────────────────────────────────────────────────────────────────────────
    # Execute tool actions (cards, travel search, hotels, itinerary)
    # ──────────────────────────────────────────────────────────────────────────
    async def _execute_actions(self, session: VoiceSession, actions: list, lang: str):
        for action in actions:
            action_type = action["type"]
            params = action["params"]

            if action_type == "SHOW_CARDS":
                await self._action_show_cards(session, params, lang)

            elif action_type == "SEARCH_TRAVEL":
                await self._action_search_travel(session, params, lang)

            elif action_type == "SEARCH_HOTELS":
                await self._action_search_hotels(session, params, lang)

            elif action_type == "GENERATE_ITINERARY":
                await self._action_generate_itinerary(session, params, lang)

            elif action_type == "FETCH_KNOWLEDGE":
                await self._action_fetch_knowledge(session, params, lang)

            elif action_type == "CONFIRM_BOOKING":
                await session.send_message({"type": "TRIGGER_BOOKING_FLOW"})

    # ── Tool: Show destination place cards ────────────────────────────────────
    async def _action_show_cards(self, session: VoiceSession, params: list, lang: str):
        destination = params[0].strip() if params else ""
        if not destination:
            return
        try:
            from services.destination_card_service import get_destination_cards
            cards = await get_destination_cards(destination)
            if cards:
                await session.send_message({
                    "type": "SHOW_DESTINATION_CARDS",
                    "destination": destination,
                    "cards": cards,
                })
        except Exception as e:
            logger.error(f"Failed to get destination cards for '{destination}': {e}")

    # ── Tool: Search flights + trains ─────────────────────────────────────────
    async def _action_search_travel(self, session: VoiceSession, params: list, lang: str):
        origin = (params[0] if len(params) > 0 else "").strip() or "delhi"
        destination = (params[1] if len(params) > 1 else "").strip()
        if not destination:
            return

        # Emit thinking phrase first
        thinking = random.choice(THINKING_PHRASES_HI if "hi" in lang else THINKING_PHRASES_EN)
        await session.send_message({
            "type": "AGENT_THINKING",
            "text": thinking,
            "language": lang,
        })
        await session.send_message({"type": "TTS_SPEAK", "text": thinking, "language": self._tts_language(lang)})

        try:
            from agents.travel import run_travel_agent
            from datetime import datetime, timedelta

            # Use date from trip state or default 2 weeks out
            travel_date = datetime.now() + timedelta(days=14)
            trip_dates = session.trip_state.get("travel_dates", {})
            if isinstance(trip_dates, dict) and trip_dates.get("start"):
                try:
                    travel_date = datetime.fromisoformat(trip_dates["start"])
                except Exception:
                    pass

            travellers = 1
            trav_obj = session.trip_state.get("travellers", {})
            if isinstance(trav_obj, dict):
                travellers = trav_obj.get("value", 1) or 1
            elif isinstance(trav_obj, int):
                travellers = trav_obj

            result = await run_travel_agent(
                trip_id=session.trip_state.get("trip_id"),
                from_code=origin,
                to_code=destination,
                date=travel_date,
                travellers=travellers,
                max_flight_results=4,
                max_train_results=4,
            )

            flights = [c for c in result.candidates if c.type == "flight"]
            trains = [c for c in result.candidates if c.type == "train"]

            # Emit results to chat panel
            await session.send_message({
                "type": "SHOW_TRAVEL_RESULTS",
                "origin": origin,
                "destination": destination,
                "flights": [self._format_flight(c) for c in flights],
                "trains": [self._format_train(c) for c in trains],
            })

            # Speak result summary
            total = len(flights) + len(trains)
            if total > 0:
                cheapest_train = min(trains, key=lambda x: x.price_inr, default=None)
                cheapest_flight = min(flights, key=lambda x: x.price_inr, default=None)

                summary_parts = []
                if cheapest_train:
                    summary_parts.append(f"{cheapest_train.train_name or 'train'} ₹{cheapest_train.price_inr}")
                if cheapest_flight:
                    airline = AIRLINE_NAMES.get(cheapest_flight.carrier or "", cheapest_flight.carrier or "flight")
                    summary_parts.append(f"{airline} ₹{cheapest_flight.price_inr}")

                if lang in ("hi-IN", "hinglish"):
                    result_phrase = random.choice(RESULT_PHRASES_HI)
                    spoken = f"{result_phrase} {len(flights)} flights aur {len(trains)} trains mile! " \
                             + (f"Sabse sasta: {' aur '.join(summary_parts[:2])}" if summary_parts else "")
                else:
                    result_phrase = random.choice(RESULT_PHRASES_EN)
                    spoken = f"{result_phrase} {len(flights)} flights and {len(trains)} trains found!"
            else:
                spoken = "Is route par abhi results nahi mile. Koi doosri date try karein?"

            await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": spoken, "language": lang})
            await session.send_message({"type": "TTS_SPEAK", "text": spoken, "language": self._tts_language(lang)})

        except Exception as e:
            logger.error(f"Travel search failed: {e}", exc_info=True)
            err = "Flight aur train search mein thodi problem aa gayi. Dobara try karein!"
            await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": err, "language": lang})
            await session.send_message({"type": "TTS_SPEAK", "text": err, "language": self._tts_language(lang)})

    # ── Tool: Search hotels ────────────────────────────────────────────────────
    async def _action_search_hotels(self, session: VoiceSession, params: list, lang: str):
        destination = (params[0] if len(params) > 0 else "").strip()
        days = int(params[1]) if len(params) > 1 and params[1].isdigit() else 3
        budget = int(params[2]) if len(params) > 2 and params[2].isdigit() else 100000

        if not destination:
            return

        thinking = random.choice(THINKING_PHRASES_HI if "hi" in lang else THINKING_PHRASES_EN)
        await session.send_message({"type": "AGENT_THINKING", "text": thinking, "language": lang})
        await session.send_message({"type": "TTS_SPEAK", "text": thinking, "language": self._tts_language(lang)})

        try:
            from agents.hotel_agent import search_hotels
            hotels = await search_hotels(destination, None, None, 2, days)

            await session.send_message({
                "type": "SHOW_HOTEL_RESULTS",
                "destination": destination,
                "hotels": [h.model_dump(mode="json") for h in hotels[:5]],
            })

            if hotels:
                cheapest = min(hotels, key=lambda h: h.price_total_inr)
                if lang in ("hi-IN", "hinglish"):
                    result_phrase = random.choice(RESULT_PHRASES_HI)
                    spoken = f"{result_phrase} {len(hotels)} hotels mile {destination} mein! " \
                             f"Budget option: {cheapest.name} — ₹{cheapest.price_total_inr} total."
                else:
                    result_phrase = random.choice(RESULT_PHRASES_EN)
                    spoken = f"{result_phrase} {len(hotels)} hotels in {destination}! " \
                             f"Budget pick: {cheapest.name} at ₹{cheapest.price_total_inr} total."
            else:
                spoken = f"{destination} mein hotels nahi mile abhi. Doosri jagah try karein?"

            await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": spoken, "language": lang})
            await session.send_message({"type": "TTS_SPEAK", "text": spoken, "language": self._tts_language(lang)})

        except Exception as e:
            logger.error(f"Hotel search failed: {e}", exc_info=True)
            err = "Hotels search mein problem aayi. Baad mein try karein!"
            await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": err, "language": lang})
            await session.send_message({"type": "TTS_SPEAK", "text": err, "language": self._tts_language(lang)})

    # ── Tool: Generate itinerary ───────────────────────────────────────────────
    async def _action_generate_itinerary(self, session: VoiceSession, params: list, lang: str):
        destination = (params[0] if len(params) > 0 else "").strip()
        days_str = params[1] if len(params) > 1 else "5"
        budget_str = params[2] if len(params) > 2 else "30000"

        # Use trip state if available (override params)
        state = session.trip_state
        dest_obj = state.get("destination", {})
        dest_name = dest_obj.get("canonical_value") if isinstance(dest_obj, dict) else dest_obj
        destination = dest_name or destination or "Goa"

        days_obj = state.get("duration_days", {})
        days = (days_obj.get("value") if isinstance(days_obj, dict) else days_obj) or int(days_str) if days_str.isdigit() else 5

        budget_obj = state.get("budget", {})
        budget = (budget_obj.get("amount") if isinstance(budget_obj, dict) else budget_obj) or int(budget_str) if budget_str.isdigit() else 30000

        interests = state.get("interests", [])

        if not destination:
            spoken = "Kaunsi jagah ka itinerary chahiye aapko?"
            await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": spoken, "language": lang})
            await session.send_message({"type": "TTS_SPEAK", "text": spoken, "language": self._tts_language(lang)})
            return

        # Thinking phrase
        thinking_texts = [
            f"{days} din ka full itinerary bana rahi hoon {destination} ke liye — ek minute!",
            f"Ek tayyari kar rahi hoon — {destination} ka ekdum detailed plan!",
        ]
        thinking = thinking_texts[0] if "hi" in lang else f"Building your {days}-day {destination} itinerary now!"
        await session.send_message({"type": "AGENT_THINKING", "text": thinking, "language": lang})
        await session.send_message({"type": "TTS_SPEAK", "text": thinking, "language": self._tts_language(lang)})

        try:
            itinerary_data = await self._generate_itinerary_stateless(
                destination=destination,
                days=days,
                budget=budget,
                interests=interests,
                language=lang,
            )

            if itinerary_data:
                await session.send_message({
                    "type": "SHOW_ITINERARY",
                    "destination": destination,
                    "days": days,
                    "budget": budget,
                    "itinerary": itinerary_data,
                })

                if "hi" in lang:
                    spoken = f"Ho gaya! {destination} ka {days} din ka pura itinerary ready hai! " \
                             f"Chat mein dekho — din by din, jagah by jagah sab kuch hai!"
                else:
                    spoken = f"Done! Your {days}-day {destination} itinerary is ready! " \
                             f"Check the chat panel for the complete day-by-day plan!"

                await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": spoken, "language": lang})
                await session.send_message({"type": "TTS_SPEAK", "text": spoken, "language": self._tts_language(lang)})
            else:
                err = f"{destination} ka itinerary abhi nahi bana. Dobara try karein!"
                await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": err, "language": lang})
                await session.send_message({"type": "TTS_SPEAK", "text": err, "language": self._tts_language(lang)})

        except Exception as e:
            logger.error(f"Itinerary generation failed: {e}", exc_info=True)
            err = "Itinerary banane mein problem aayi. Ek minute baad try karein!"
            await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": err, "language": lang})
            await session.send_message({"type": "TTS_SPEAK", "text": err, "language": self._tts_language(lang)})

    # ── Tool: Fetch knowledge (hidden gems, FAQs) ─────────────────────────────
    async def _action_fetch_knowledge(self, session: VoiceSession, params: list, lang: str):
        destination = (params[0] if len(params) > 0 else "").strip()
        query = (params[1] if len(params) > 1 else "places to visit").strip()
        full_query = f"{destination} {query}" if destination else query

        thinking = "Ek second, dhundh rahi hoon..." if "hi" in lang else "Searching for that information..."
        await session.send_message({"type": "AGENT_THINKING", "text": thinking, "language": lang})

        try:
            from services.rag_service import answer as rag_answer
            result = await rag_answer(full_query, top_k=3)
            answer_text = result.get("answer", "")

            if answer_text:
                await session.send_message({
                    "type": "SHOW_KNOWLEDGE",
                    "destination": destination,
                    "query": query,
                    "answer": answer_text,
                    "source_type": result.get("source_type"),
                })

                # Speak a brief summary
                spoken_summary = answer_text[:300] + "..." if len(answer_text) > 300 else answer_text
                await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": spoken_summary, "language": lang})
                await session.send_message({"type": "TTS_SPEAK", "text": spoken_summary, "language": self._tts_language(lang)})

        except Exception as e:
            logger.error(f"Knowledge fetch failed: {e}")
            err = "Abhi information nahi mili. Internet se dhundhne ki koshish karo!"
            await session.send_message({"type": "AGENT_RESPONSE_TEXT", "text": err, "language": lang})

    # ──────────────────────────────────────────────────────────────────────────
    # Stateless itinerary generator (no DB required)
    # ──────────────────────────────────────────────────────────────────────────
    async def _generate_itinerary_stateless(
        self,
        destination: str,
        days: int,
        budget: int,
        interests: List[str],
        language: str,
    ) -> Optional[dict]:
        if not self.gemini_key:
            return None

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.gemini_key)

            interests_str = ", ".join(interests) if interests else "sightseeing, food, culture"
            lang_instruction = "Reply in Hindi/Hinglish" if "hi" in language else "Reply in English"

            prompt = f"""Generate a detailed day-by-day travel itinerary for {destination}.

Trip details:
- Duration: {days} days
- Total budget: ₹{budget}
- Interests: {interests_str}
- Language: {lang_instruction}

Return ONLY a JSON object with this exact structure:
{{
  "destination": "{destination}",
  "total_days": {days},
  "total_budget_inr": {budget},
  "days": [
    {{
      "day": 1,
      "title": "Arrival & First Impressions",
      "estimated_spend_inr": 2000,
      "slots": [
        {{
          "time": "09:00",
          "type": "travel",
          "activity": "Depart from home city",
          "description": "Short description",
          "estimated_cost_inr": 500
        }},
        {{
          "time": "14:00",
          "type": "explore",
          "activity": "Visit main attraction",
          "description": "Short description",
          "estimated_cost_inr": 200
        }},
        {{
          "time": "19:00",
          "type": "food",
          "activity": "Local dinner",
          "description": "Try local cuisine",
          "estimated_cost_inr": 300
        }}
      ]
    }}
  ],
  "tips": ["Pack light", "Carry cash"],
  "best_season": "October to March"
}}

IMPORTANT:
- Include AT LEAST 4 time slots per day (morning, afternoon, evening, night)
- Types: travel, explore, food, checkin, checkout, activity
- Keep costs realistic for India
- Day 1 must include travel arrival and checkin
- Last day must include checkout and departure
- Return ONLY the JSON, no markdown or preamble"""

            model = genai.GenerativeModel(
                "gemini-2.0-flash",
                generation_config={"response_mime_type": "application/json"},
            )
            response = await asyncio.to_thread(
                model.generate_content, prompt
            )
            return json.loads(response.text)

        except Exception as e:
            logger.error(f"Stateless itinerary generation failed: {e}")
            return None

    # ──────────────────────────────────────────────────────────────────────────
    # Formatters
    # ──────────────────────────────────────────────────────────────────────────
    def _format_flight(self, candidate) -> dict:
        airline = AIRLINE_NAMES.get(candidate.carrier or "", candidate.carrier or "Airline")
        hrs = candidate.duration_minutes // 60
        mins = candidate.duration_minutes % 60
        return {
            "id": candidate.id,
            "type": "flight",
            "carrier": candidate.carrier,
            "airline_name": airline,
            "flight_number": candidate.flight_number,
            "from_code": candidate.from_code,
            "to_code": candidate.to_code,
            "departure": candidate.departure.isoformat() if candidate.departure else None,
            "arrival": candidate.arrival.isoformat() if candidate.arrival else None,
            "duration_minutes": candidate.duration_minutes,
            "duration_label": f"{hrs}h {mins}m",
            "price_inr": candidate.price_inr,
            "stops": candidate.stops,
        }

    def _format_train(self, candidate) -> dict:
        hrs = candidate.duration_minutes // 60
        mins = candidate.duration_minutes % 60
        return {
            "id": candidate.id,
            "type": "train",
            "train_name": candidate.train_name,
            "train_number": candidate.train_number,
            "from_code": candidate.from_code,
            "to_code": candidate.to_code,
            "departure": candidate.departure.isoformat() if candidate.departure else None,
            "duration_minutes": candidate.duration_minutes,
            "duration_label": f"{hrs}h {mins}m",
            "price_inr": candidate.price_inr,
            "class_options": [
                {"class_code": c.class_code, "price_inr": c.price_inr, "availability": c.availability}
                for c in (candidate.class_options or [])
            ],
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Language detection helpers
    # ──────────────────────────────────────────────────────────────────────────
    def _detect_language(self, text: str) -> str:
        hindi_words = {"mujhe", "mein", "hai", "hoon", "chahiye", "karo", "jaana", "kahan",
                       "dikhao", "kitne", "nahi", "aur", "bahut", "ek", "do", "kya", "ye",
                       "wahan", "acha", "bilkul", "haan", "theek", "bolo", "kar", "se", "ke"}
        words = set(text.lower().split())
        has_hindi = bool(words & hindi_words)
        has_english = any(len(w) > 3 and w.isalpha() and w not in hindi_words for w in words)
        if has_hindi and has_english:
            return "hinglish"
        elif has_hindi:
            return "hi-IN"
        return "en-IN"

    def _tts_language(self, lang: str) -> str:
        if lang in ("hi-IN", "hi"):
            return "hi-IN"
        if lang == "hinglish":
            return "hi-IN"  # Use Hindi voice for Hinglish
        return "en-IN"
