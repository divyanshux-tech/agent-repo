# services/voice/gemini_live_gateway.py
# Replaces the Groq ASR + Edge TTS pipeline with Gemini Live bidirectional audio

import asyncio
import json
import logging
import os
import base64
from collections import deque
from typing import Optional, List, Dict, Any

from google import genai
from google.genai.types import (
    LiveConnectConfig, SpeechConfig, VoiceConfig,
    PrebuiltVoiceConfig, Content, Part, Tool, FunctionDeclaration,
    LiveClientToolResponse, FunctionResponse
)
from fastapi import WebSocket
from services.voice.voice_session import VoiceSession, VoiceState

logger = logging.getLogger(__name__)

# ── Voice Agent Persona Prompt ──────────────────────────────────────────────
VOICE_SYSTEM_PROMPT = """You are Nura, an elite Indian female AI travel expert.
You speak like a warm, confident Indian woman — Hinglish naturally, like a real dost.
You are in a LIVE VOICE call. Keep responses SHORT (1–3 sentences).
Use fillers: "acha", "hmm", "bilkul", "dekhiye", "ek second" — sound human.
When you need to search something, call the tool — don't say you'll search, just do it.
NEVER read out long lists. Summarize and say "chat mein dekh sakte hain details".
Always maintain an encouraging, lively, and helpful tone.
"""

# ── Short-term In-process Conversation & Entity Buffer ──────────────────────
class ConversationBuffer:
    def __init__(self, maxlen: int = 20):
        self.turns = deque(maxlen=maxlen)
        self.entity_memory: Dict[str, Any] = {}

    def add_turn(self, role: str, text: str, entities: dict = None):
        self.turns.append({"role": role, "text": text})
        if entities:
            self.entity_memory.update(entities)

    def get_context_for_prompt(self) -> str:
        lines = [f"{t['role']}: {t['text']}" for t in self.turns]
        return "\n".join(lines[-10:])  # last 10 turns

    def get_entity(self, key: str) -> Any:
        return self.entity_memory.get(key)


# ── Native Gemini Function Declarations ─────────────────────────────────────
TOOLS = [
    Tool(function_declarations=[
        FunctionDeclaration(
            name="search_flights_trains",
            description="Search flights and trains between Indian cities",
            parameters={
                "type": "object",
                "properties": {
                    "origin": {"type": "string", "description": "Origin city name (e.g. Delhi, Mumbai)"},
                    "destination": {"type": "string", "description": "Destination city name (e.g. Goa, Jaipur)"},
                    "date": {"type": "string", "description": "ISO date string or YYYY-MM-DD"},
                    "travellers": {"type": "integer", "description": "Number of travellers"}
                },
                "required": ["origin", "destination"]
            }
        ),
        FunctionDeclaration(
            name="search_hotels",
            description="Find hotels at destination within budget",
            parameters={
                "type": "object",
                "properties": {
                    "destination": {"type": "string", "description": "Destination city or state"},
                    "nights": {"type": "integer", "description": "Number of nights"},
                    "budget_per_night": {"type": "integer", "description": "Budget per night in INR"}
                },
                "required": ["destination"]
            }
        ),
        FunctionDeclaration(
            name="show_destination_cards",
            description="Show visual place cards for a destination",
            parameters={
                "type": "object",
                "properties": {"destination": {"type": "string", "description": "Destination name"}},
                "required": ["destination"]
            }
        ),
        FunctionDeclaration(
            name="start_panorama_tour",
            description="Show 3D panoramic virtual tour of a place in India",
            parameters={
                "type": "object",
                "properties": {
                    "destination": {"type": "string", "description": "Place name e.g. Alleppey, Taj Mahal"},
                    "scene_type": {"type": "string", "enum": ["beach", "temple", "nature", "city", "hill"]}
                },
                "required": ["destination"]
            }
        ),
        FunctionDeclaration(
            name="generate_itinerary",
            description="Generate day-by-day travel itinerary with costs and activities",
            parameters={
                "type": "object",
                "properties": {
                    "destination": {"type": "string", "description": "Destination city or region"},
                    "days": {"type": "integer", "description": "Total duration in days"},
                    "budget_inr": {"type": "integer", "description": "Total budget in INR"},
                    "interests": {"type": "array", "items": {"type": "string"}, "description": "User interests"}
                },
                "required": ["destination", "days"]
            }
        ),
        FunctionDeclaration(
            name="get_hidden_gems",
            description="Find offbeat lesser-known places near destination",
            parameters={
                "type": "object",
                "properties": {
                    "destination": {"type": "string", "description": "Destination name"},
                    "radius_km": {"type": "integer", "description": "Search radius in km"}
                },
                "required": ["destination"]
            }
        ),
        FunctionDeclaration(
            name="get_safety_info",
            description="Get safety tips, advisories, and emergency helpline for destination",
            parameters={
                "type": "object",
                "properties": {"destination": {"type": "string", "description": "Destination name"}},
                "required": ["destination"]
            }
        ),
        FunctionDeclaration(
            name="optimize_budget",
            description="Optimize trip budget across flights, hotels, and activities",
            parameters={
                "type": "object",
                "properties": {
                    "destination": {"type": "string", "description": "Destination name"},
                    "total_budget_inr": {"type": "integer", "description": "Total budget in INR"},
                    "days": {"type": "integer", "description": "Number of days"},
                    "priority": {"type": "string", "enum": ["cheapest", "best_value", "comfort"]}
                },
                "required": ["destination", "total_budget_inr"]
            }
        ),
    ])
]


class GeminiLiveGateway:
    """
    Sub-500ms Gemini Live bidirectional voice gateway.
    Handles PCM audio streaming, live function calling, and UI synchronization.
    Features automatic fallback to the high-quality local VoiceGateway if Live API is unavailable.
    """
    def __init__(self):
        self.sessions: Dict[str, VoiceSession] = {}
        self.api_key = os.environ.get("GEMINI_API_KEY", "")
        self.client = None
        self.fallback_gateway = None
        
        try:
            from services.voice.voice_gateway import VoiceGateway
            self.fallback_gateway = VoiceGateway()
        except Exception as e:
            logger.warning(f"Could not load fallback VoiceGateway: {e}")

        if self.api_key:
            try:
                # Use v1alpha for Multimodal Live WebSockets
                self.client = genai.Client(api_key=self.api_key, http_options={"api_version": "v1alpha"})
            except Exception as e:
                logger.warning(f"Failed to initialize genai.Client: {e}")

    async def connect(self, websocket: WebSocket, session_id: str, user_id: str = None):
        await websocket.accept()
        session = VoiceSession(session_id, websocket)
        session.user_id = user_id
        session.trip_state = {}
        session.conversation_history = []
        session.panorama_active = False
        session.current_scene_id = None
        session.current_scene = None
        session.detected_language = "hinglish"
        session.buffer = ConversationBuffer(maxlen=20)
        session.use_fallback = False
        self.sessions[session_id] = session

        await session.send_message({
            "type": "CONNECTION_ESTABLISHED",
            "session_id": session_id,
            "message": "Nura Live Voice Agent connected! 🎙️",
        })

        # Start Gemini Live bidirectional session in background task
        session.live_task = asyncio.create_task(
            self._run_live_session(session)
        )

    async def _run_live_session(self, session: VoiceSession):
        """Main Gemini Live bidirectional loop."""
        config = LiveConnectConfig(
            response_modalities=["AUDIO", "TEXT"],
            speech_config=SpeechConfig(
                voice_config=VoiceConfig(
                    prebuilt_voice_config=PrebuiltVoiceConfig(voice_name="Aoede")
                    # Aoede = warm natural female voice; alternatives: Leda, Zephyr
                )
            ),
            system_instruction=VOICE_SYSTEM_PROMPT,
            tools=TOOLS,
        )

        # Attempt connection to live models
        candidate_models = ["gemini-2.0-flash-live-001", "gemini-2.0-flash-exp", "gemini-2.0-flash"]
        connected = False

        if self.client:
            for model_name in candidate_models:
                try:
                    logger.info(f"Connecting to Gemini Live with model: {model_name}")
                    async with self.client.aio.live.connect(model=model_name, config=config) as live_session:
                        session.live_session = live_session
                        connected = True
                        logger.info(f"Connected to Gemini Live session ({model_name})")

                        # Initial greeting
                        await live_session.send(
                            input="Namaste bolo aur 1 sentence mein introduction do ki aap Nura ho, Indian travel expert.",
                            end_of_turn=True,
                        )

                        # Bidirectional Receive Loop
                        async for response in live_session.receive():
                            # 1. PCM Audio bytes — stream immediately to frontend
                            if response.data:
                                audio_b64 = base64.b64encode(response.data).decode("utf-8")
                                await session.send_message({
                                    "type": "AUDIO_OUTPUT",
                                    "audio_b64": audio_b64,
                                    "mime_type": "audio/pcm;rate=24000",
                                })

                            # 2. Text transcript of what the agent is speaking
                            if response.text:
                                if session.buffer:
                                    session.buffer.add_turn("assistant", response.text)
                                await session.send_message({
                                    "type": "AGENT_TRANSCRIPT",
                                    "text": response.text,
                                })

                            # 3. Native Function/Tool Calling
                            if response.tool_call:
                                for fc in response.tool_call.function_calls:
                                    tool_name = fc.name
                                    tool_args = dict(fc.args) if fc.args else {}
                                    logger.info(f"Executing tool: {tool_name} with args: {tool_args}")
                                    result = await self._execute_tool(session, tool_name, tool_args)
                                    
                                    # Send structured tool result back to Gemini Live
                                    await live_session.send(
                                        input=LiveClientToolResponse(
                                            function_responses=[
                                                FunctionResponse(
                                                    name=tool_name,
                                                    id=fc.id,
                                                    response={"result": result}
                                                )
                                            ]
                                        )
                                    )

                        # Loop finished normally
                        break

                except asyncio.CancelledError:
                    logger.info(f"Session {session.session_id} cancelled.")
                    break
                except Exception as e:
                    logger.warning(f"Live connect attempt with {model_name} failed: {e}")
                    continue

        if not connected:
            logger.warning("Gemini Live connection unavailable — activating seamless Voice Gateway fallback.")
            session.use_fallback = True
            if self.fallback_gateway:
                self.fallback_gateway.sessions[session.session_id] = session
            
            welcome = "Namaste! Main Nura hoon, aapki AI travel expert dost. Aaj kahan ghoomne chalna chahte hain?"
            await session.send_message({
                "type": "AGENT_RESPONSE_TEXT",
                "text": welcome,
                "language": "hinglish",
            })
            await session.send_message({
                "type": "TTS_SPEAK",
                "text": welcome,
                "language": "en-IN",
            })
            await session.send_message({"type": "TURN_COMPLETE"})
            await session.set_state(VoiceState.IDLE)

    async def handle_message(self, session_id: str, message: dict):
        session = self.sessions.get(session_id)
        if not session:
            return

        # Seamless delegation to fallback orchestrator if Live is not active
        if getattr(session, "use_fallback", False) and self.fallback_gateway:
            await self.fallback_gateway.handle_message(session_id, message)
            return

        msg_type = message.get("type")

        # 1. Incoming Audio Stream (PCM from mic)
        if msg_type == "AUDIO_CHUNK":
            audio_b64 = message.get("audio_b64", "")
            if audio_b64 and hasattr(session, "live_session") and session.live_session:
                try:
                    audio_bytes = base64.b64decode(audio_b64)
                    await session.live_session.send(
                        input={"data": audio_bytes, "mime_type": "audio/pcm;rate=16000"}
                    )
                except Exception as e:
                    logger.error(f"Error sending audio chunk: {e}")

        # 2. End of speech signal (e.g. from frontend VAD)
        elif msg_type == "END_OF_SPEECH":
            if hasattr(session, "live_session") and session.live_session:
                try:
                    await session.live_session.send(
                        input={"data": b"", "mime_type": "audio/pcm;rate=16000"},
                        end_of_turn=True,
                    )
                except Exception as e:
                    logger.error(f"Error sending end of speech: {e}")

        # 3. Direct Text Input
        elif msg_type == "TEXT_INPUT":
            text = message.get("text", "").strip()
            if text:
                if session.buffer:
                    session.buffer.add_turn("user", text)
                if hasattr(session, "live_session") and session.live_session:
                    try:
                        await session.live_session.send(input=text, end_of_turn=True)
                    except Exception as e:
                        logger.error(f"Error sending text input: {e}")

        # 4. Barge-in / Interrupt
        elif msg_type == "INTERRUPT":
            await session.cancel_turn()

        # 5. Panorama Navigation
        elif msg_type == "PANORAMA_NAVIGATE":
            direction = message.get("direction", "")
            await self._handle_panorama_nav(session, direction)

        # 6. Panorama Scene Loaded
        elif msg_type == "PANORAMA_SCENE_LOADED":
            scene_id = message.get("scene_id")
            if scene_id and scene_id == session.current_scene_id:
                prompt = f"Scene load ho gayi hai. Ab is jagah ke baare mein 2-3 sentences mein bolo ek friendly tour guide ki tarah."
                if hasattr(session, "live_session") and session.live_session:
                    try:
                        await session.live_session.send(input=prompt, end_of_turn=True)
                    except Exception as e:
                        logger.error(f"Error sending scene narration prompt: {e}")

    async def _execute_tool(self, session: VoiceSession, tool_name: str, args: dict) -> dict:
        """Execute tool and dispatch visual result cards to frontend WebSocket."""
        logger.info(f"Tool execution: {tool_name} with args: {args}")

        try:
            # ── 1. Search Flights & Trains ──────────────────────────────────
            if tool_name == "search_flights_trains":
                from agents.travel import run_travel_agent
                from datetime import datetime, timedelta
                
                date_str = args.get("date")
                try:
                    dt = datetime.fromisoformat(date_str) if date_str else datetime.now() + timedelta(days=14)
                except Exception:
                    dt = datetime.now() + timedelta(days=14)

                origin = args.get("origin", "Delhi")
                dest = args.get("destination", "Goa")
                travellers = args.get("travellers", 1)

                result = await run_travel_agent(
                    trip_id=session.trip_state.get("trip_id"),
                    from_code=origin,
                    to_code=dest,
                    date=dt,
                    travellers=travellers,
                    max_flight_results=4,
                    max_train_results=4,
                )
                flights = [c for c in result.candidates if c.type == "flight"] if result else []
                trains = [c for c in result.candidates if c.type == "train"] if result else []

                # Push visual cards to chat panel
                await session.send_message({
                    "type": "SHOW_TRAVEL_RESULTS",
                    "origin": origin,
                    "destination": dest,
                    "flights": [self._fmt_flight(f) for f in flights],
                    "trains": [self._fmt_train(t) for t in trains],
                })

                cheapest_flight = min(flights, key=lambda x: x.price_inr, default=None)
                cheapest_train = min(trains, key=lambda x: x.price_inr, default=None)
                return {
                    "flights_found": len(flights),
                    "trains_found": len(trains),
                    "cheapest_flight_inr": cheapest_flight.price_inr if cheapest_flight else None,
                    "cheapest_train_inr": cheapest_train.price_inr if cheapest_train else None,
                    "summary": f"{len(flights)} flights and {len(trains)} trains found. Visual cards displayed."
                }

            # ── 2. Search Hotels ────────────────────────────────────────────
            elif tool_name == "search_hotels":
                from agents.hotel_agent import search_hotels
                dest = args.get("destination", "Goa")
                nights = args.get("nights", 3)
                hotels = await search_hotels(dest, None, None, 2, nights)
                
                # Sort cheapest first
                hotels_sorted = sorted(hotels, key=lambda h: getattr(h, "price_total_inr", 0))
                await session.send_message({
                    "type": "SHOW_HOTEL_RESULTS",
                    "destination": dest,
                    "hotels": [h.model_dump(mode="json") for h in hotels_sorted[:5]],
                })
                cheapest = hotels_sorted[0] if hotels_sorted else None
                return {
                    "hotels_found": len(hotels),
                    "cheapest_name": getattr(cheapest, "name", None) if cheapest else None,
                    "cheapest_price_inr": getattr(cheapest, "price_total_inr", None) if cheapest else None,
                    "summary": f"{len(hotels)} hotels found. Displayed in chat."
                }

            # ── 3. Start 3D Panorama Tour ───────────────────────────────────
            elif tool_name == "start_panorama_tour":
                from services.panorama_service import search_scene, get_related_scenes, build_panorama_event
                dest = args.get("destination", "")
                scene = search_scene(dest)
                if scene:
                    session.panorama_active = True
                    session.current_scene_id = scene["id"]
                    session.current_scene = scene
                    session.tour_visited.append(scene["id"])
                    related = get_related_scenes(scene["id"], limit=4)
                    event = build_panorama_event(scene, "", related)
                    await session.send_message(event)
                    return {
                        "scene_loaded": scene["name"],
                        "city": scene["city"],
                        "description": scene.get("description", ""),
                        "hidden_gems": scene.get("hidden_gems", [])[:3],
                        "instruction": "360° panorama tour viewer opened on screen. Speak 2-3 enthusiastic sentences about this scene."
                    }
                return {"error": f"3D panoramic scene not found for {dest}."}

            # ── 4. Generate Itinerary ───────────────────────────────────────
            elif tool_name == "generate_itinerary":
                dest = args.get("destination", "Goa")
                days = args.get("days", 5)
                budget = args.get("budget_inr", 30000)
                interests = args.get("interests") or session.trip_state.get("interests", [])

                itinerary = await self._generate_itinerary_stateless(
                    destination=dest,
                    days=days,
                    budget=budget,
                    interests=interests,
                    language=session.detected_language or "hinglish"
                )
                if itinerary:
                    await session.send_message({
                        "type": "SHOW_ITINERARY",
                        "itinerary": itinerary,
                        "destination": dest,
                        "days": days,
                    })

                    # Show destination visual cards alongside
                    from services.destination_card_service import get_destination_cards
                    cards = await get_destination_cards(dest)
                    if cards:
                        await session.send_message({
                            "type": "SHOW_DESTINATION_CARDS",
                            "destination": dest,
                            "cards": cards,
                        })

                    return {
                        "itinerary_ready": True,
                        "days": itinerary.get("total_days", days),
                        "summary": f"{days}-day itinerary generated with day-by-day activities and PDF export."
                    }
                return {"error": "Could not generate itinerary"}

            # ── 5. Get Hidden Gems ──────────────────────────────────────────
            elif tool_name == "get_hidden_gems":
                dest = args.get("destination", "Goa")
                from services.rag_service import answer as rag_answer
                result = await rag_answer(f"{dest} hidden gems offbeat places less traveled", language="hinglish", top_k=5)
                answer = result.get("answer", "")
                
                # Fallback to Tavily
                if not answer or len(answer) < 80:
                    try:
                        from services.tavily_service import search as tavily_search
                        tav_res = await tavily_search(f"{dest} hidden gems offbeat India travel")
                        if tav_res:
                            answer = tav_res[0].get("content", answer)
                    except Exception:
                        pass

                await session.send_message({
                    "type": "SHOW_KNOWLEDGE",
                    "title": f"Hidden Gems near {dest}",
                    "content": answer,
                    "category": "hidden_gems",
                    "destination": dest,
                })
                return {"gems_found": bool(answer), "summary": "Offbeat hidden gems displayed in chat."}

            # ── 6. Get Safety Info ──────────────────────────────────────────
            elif tool_name == "get_safety_info":
                dest = args.get("destination", "India")
                content = f"Standard travel safety in {dest}: Keep government ID handy, avoid isolated areas late at night, and use registered cabs. National emergency number: 112."
                await session.send_message({
                    "type": "SHOW_KNOWLEDGE",
                    "title": f"Safety Info — {dest}",
                    "content": content,
                    "category": "safety",
                    "destination": dest,
                })
                return {"safety_info_shown": True}

            # ── 7. Optimize Budget ──────────────────────────────────────────
            elif tool_name == "optimize_budget":
                from agents.budget_optimizer import optimize
                dest = args.get("destination", "Goa")
                total_budget = args.get("total_budget_inr", 35000)
                days = args.get("days", 4)
                priority = args.get("priority", "best_value")

                result = await optimize(
                    destination=dest,
                    total_budget=total_budget,
                    days=days,
                    priority=priority,
                )
                await session.send_message({
                    "type": "SHOW_BUDGET_PLAN",
                    "plans": result if isinstance(result, list) else [result],
                    "destination": dest,
                })
                return {"plans_ready": True, "summary": "Budget allocation plans displayed in chat."}

            # ── 8. Show Destination Cards ───────────────────────────────────
            elif tool_name == "show_destination_cards":
                dest = args.get("destination", "Goa")
                from services.destination_card_service import get_destination_cards
                cards = await get_destination_cards(dest)
                if cards:
                    await session.send_message({
                        "type": "SHOW_DESTINATION_CARDS",
                        "destination": dest,
                        "cards": cards,
                    })
                return {"cards_shown": len(cards) if cards else 0}

        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}", exc_info=True)
            return {"error": str(e)}

        return {"error": f"Unknown tool: {tool_name}"}

    async def _generate_itinerary_stateless(
        self,
        destination: str,
        days: int,
        budget: int,
        interests: List[str],
        language: str = "hinglish",
    ) -> Optional[dict]:
        """Generate structured itinerary JSON using Gemini 2.0 Flash."""
        try:
            import google.generativeai as legacy_genai
            api_key = os.environ.get("GEMINI_API_KEY", "")
            if not api_key:
                return None
            legacy_genai.configure(api_key=api_key)

            interests_str = ", ".join(interests) if interests else "sightseeing, food, culture"
            prompt = f"""Generate a detailed {days}-day travel itinerary for {destination} with a total budget of Rs. {budget}.
Interests: {interests_str}.
Return ONLY valid JSON matching this schema:
{{
  "destination": "{destination}",
  "total_days": {days},
  "total_budget_inr": {budget},
  "days": [
    {{
      "day": 1,
      "title": "Day title",
      "estimated_spend_inr": 2000,
      "slots": [
        {{
          "time": "09:00",
          "type": "sightseeing",
          "activity": "Activity name",
          "description": "Brief description",
          "estimated_cost_inr": 500
        }}
      ]
    }}
  ],
  "tips": ["Tip 1", "Tip 2"]
}}"""
            model = legacy_genai.GenerativeModel(
                "gemini-2.0-flash",
                generation_config={"response_mime_type": "application/json"}
            )
            response = await asyncio.to_thread(model.generate_content, prompt)
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Stateless itinerary generation failed: {e}")
            return None

    def _fmt_flight(self, c) -> dict:
        return {
            "type": "flight",
            "carrier": getattr(c, "carrier", "Flight"),
            "from": getattr(c, "from_code", ""),
            "to": getattr(c, "to_code", ""),
            "price_inr": getattr(c, "price_inr", 0),
            "duration_min": getattr(c, "duration_minutes", 0),
            "departure": c.departure.isoformat() if getattr(c, "departure", None) else None,
        }

    def _fmt_train(self, c) -> dict:
        return {
            "type": "train",
            "name": getattr(c, "train_name", "Express"),
            "from": getattr(c, "from_code", ""),
            "to": getattr(c, "to_code", ""),
            "price_inr": getattr(c, "price_inr", 0),
            "duration_min": getattr(c, "duration_minutes", 0),
        }

    async def _handle_panorama_nav(self, session: VoiceSession, direction: str):
        """Navigate to connected panoramic scenes."""
        if not session.panorama_active or not session.current_scene_id:
            return
        from services.panorama_service import get_related_scenes, build_panorama_event
        related = get_related_scenes(session.current_scene_id, limit=4)
        if related:
            next_scene = related[0]
            for s in related:
                if s["id"] not in session.tour_visited:
                    next_scene = s
                    break
            session.current_scene_id = next_scene["id"]
            session.current_scene = next_scene
            session.tour_visited.append(next_scene["id"])
            event = build_panorama_event(next_scene, "", get_related_scenes(next_scene["id"], 3))
            await session.send_message(event)

            prompt = f"Hum abhi {next_scene['name']} pahunch gaye hain. Iske baare mein 2 short sentences bolo enthusiastic tour guide ki tarah."
            if hasattr(session, "live_session") and session.live_session:
                await session.live_session.send(input=prompt, end_of_turn=True)

    def disconnect(self, session_id: str):
        if self.fallback_gateway:
            self.fallback_gateway.disconnect(session_id)
        if session_id in self.sessions:
            session = self.sessions[session_id]
            if hasattr(session, "live_task") and session.live_task and not session.live_task.done():
                session.live_task.cancel()
            session.is_active = False
            del self.sessions[session_id]
            logger.info(f"Disconnected session: {session_id}")
