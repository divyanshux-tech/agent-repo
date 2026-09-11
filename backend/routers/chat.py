"""
Chat Router — Production-Grade Agentic SSE Pipeline
Handles all intent actions with rich, structured streaming events.

Event types emitted:
  tool_step          : step progress (message, status: running|done|error)
  state_sync         : updated trip state + trip_id
  nlu                : raw NLU result
  message            : plain agent text response
  knowledge_message  : RAG/web knowledge answer + web_sources for chips
  destination_cards  : place cards for a destination
  agent_candidates   : flights + trains + hotels cards
  plans              : optimised budget plans
  itinerary          : full day-by-day itinerary JSON
  weather_message    : weather summary + data
  companion_message  : packing list / documents / flight status
  replan_diff        : what changed in a replan
"""
import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from agents.activity_agent import search_activities
from agents.budget_optimizer import optimize
from agents.hotel_agent import search_hotels
from agents.orchestrator import handle_chat_turn
from agents.travel_agent import search_travel  # noqa: F401 — kept for import compat
from models.chat import ChatRequest
from services.estimator_service import estimate_expenses
from services.rag_service import answer as rag_answer
from services.replan_service import ReplanService

logger = logging.getLogger(__name__)
router = APIRouter()


def _jl(data: dict) -> str:
    """Emit a JSON-Lines event."""
    return json.dumps(data, ensure_ascii=False) + "\n"


def _loc(value) -> str | None:
    if isinstance(value, dict):
        return (
            value.get("canonical_value")
            or value.get("canonical")
            or value.get("raw_value")
            or value.get("raw")
        )
    return value


def _scalar(value):
    if isinstance(value, dict):
        return value.get("value")
    return value


def _travel_date(value) -> str | None:
    if isinstance(value, dict):
        return value.get("start") or value.get("exact_date") or value.get("raw_value")
    return value


# ── Main chat endpoint ────────────────────────────────────────────────────────

@router.post("")
async def chat(request: ChatRequest):
    async def event_stream():
        yield _jl({"type": "tool_step", "message": "Samajh rahi hoon...", "status": "running"})

        # ── NLU / Orchestrator turn ───────────────────────────────────────
        try:
            turn = await handle_chat_turn(request)
        except Exception as exc:
            logger.error(f"Orchestrator failed: {exc}")
            yield _jl({"type": "message", "content": "Kuch technical issue aa gaya. Please try again!", "language": "hinglish"})
            return

        yield _jl({"type": "tool_step", "message": "Samajh gayi!", "status": "done"})
        yield _jl({"type": "state_sync", "updated_state": turn.updated_state, "trip_id": turn.trip_id})
        yield _jl({"type": "nlu", "data": turn.nlu})

        # ── Clarification needed ──────────────────────────────────────────
        if turn.requires_clarification:
            yield _jl({"type": "message", "content": turn.user_facing_message, "language": turn.language})
            return

        # ── Extract state fields ──────────────────────────────────────────
        state       = turn.updated_state
        source      = _loc(state.get("origin")) or "Delhi"
        destination = _loc(state.get("destination"))
        travel_date = _travel_date(state.get("travel_dates"))
        days        = _scalar(state.get("duration_days")) or 3
        travellers  = _scalar(state.get("travellers")) or 1
        budget      = (state.get("budget") or {}).get("amount") or 30000
        interests   = state.get("interests", [])
        month       = (state.get("travel_dates") or {}).get("month") or 10
        language    = turn.language

        # ── Destination cards (shown alongside most intents) ──────────────
        if destination and turn.action in (
            "SEARCH_COMPONENTS", "START_PLANNING", "GET_ITINERARY",
            "ASK_KNOWLEDGE", "RECOMMEND_DESTINATIONS",
        ):
            try:
                from services.destination_card_service import get_destination_cards
                cards = await get_destination_cards(destination)
                if cards:
                    yield _jl({"type": "destination_cards", "destination": destination, "cards": cards})
            except Exception:
                pass

        # ══════════════════════════════════════════════════════════════════
        # ACTION: SEARCH_COMPONENTS
        # Full search: flights + trains + hotels + activities + budget plans
        # ══════════════════════════════════════════════════════════════════
        if turn.action == "SEARCH_COMPONENTS":
            from agents.travel import run_travel_agent
            from datetime import datetime, timedelta

            # Parse travel date
            try:
                if travel_date:
                    dt = datetime.fromisoformat(travel_date.replace("Z", "+00:00"))
                else:
                    dt = datetime.now() + timedelta(days=14)
            except Exception:
                dt = datetime.now() + timedelta(days=14)

            yield _jl({"type": "tool_step", "message": f"🔍 {destination} ke liye travel options aur hotels dhundh rahi hoon...", "status": "running"})
            
            import asyncio
            async def safe_travel_search():
                try:
                    return await asyncio.wait_for(run_travel_agent(
                        trip_id=turn.trip_id,
                        from_code=source,
                        to_code=destination,
                        date=dt,
                        travellers=travellers,
                    ), timeout=8.0)
                except asyncio.TimeoutError:
                    logger.warning("Travel search timed out")
                    return None
                except Exception as e:
                    logger.error(f"Travel search failed: {e}")
                    return None

            async def safe_hotel_search():
                try:
                    return await asyncio.wait_for(
                        search_hotels(destination, travel_date, None, travellers, days),
                        timeout=8.0
                    )
                except asyncio.TimeoutError:
                    logger.warning("Hotel search timed out")
                    return []
                except Exception as e:
                    logger.error(f"Hotel search failed: {e}")
                    return []

            # Run in parallel
            travel_res, hotels = await asyncio.gather(
                safe_travel_search(),
                safe_hotel_search(),
            )
            
            flights = [c for c in travel_res.candidates if c.type == "flight"] if travel_res else []
            trains  = [c for c in travel_res.candidates if c.type == "train"] if travel_res else []
            yield _jl({"type": "tool_step", "message": f"✈️ {len(flights)} flights, 🚂 {len(trains)} trains, 🏨 {len(hotels)} stays mili!", "status": "done"})

            yield _jl({"type": "tool_step", "message": "🎯 Activities explore kar rahi hoon...", "status": "running"})
            activities = search_activities(destination, month, interests, budget, travellers)
            yield _jl({"type": "tool_step", "message": f"🎯 {len(activities)} activities!", "status": "done"})

            # Emit raw results for card rendering immediately
            yield _jl({
                "type": "agent_candidates",
                "flights": [c.model_dump(mode="json") for c in flights],
                "trains":  [c.model_dump(mode="json") for c in trains],
                "hotels":  [h.model_dump(mode="json") for h in hotels],
            })

            yield _jl({"type": "tool_step", "message": "💰 Budget optimise kar rahi hoon...", "status": "running"})
            estimates = estimate_expenses(destination, days, travellers, "standard")
            plans = optimize(
                travel_candidates=flights + trains,
                hotel_candidates=hotels,
                activity_candidates=activities,
                estimated_expenses=estimates,
                total_budget=budget,
            )
            yield _jl({"type": "tool_step", "message": f"✅ {len(plans)} best plans ready!", "status": "done"})
            yield _jl({"type": "message", "content": turn.user_facing_message, "language": language})
            if plans:
                yield _jl({"type": "plans", "data": [p.model_dump(mode="json") for p in plans]})

        # ══════════════════════════════════════════════════════════════════
        # ACTION: GET_ITINERARY
        # Full day-by-day itinerary with Gemini + destination knowledge
        # ══════════════════════════════════════════════════════════════════
        elif turn.action == "GET_ITINERARY":
            if not destination:
                yield _jl({"type": "message", "content": "Kaunsa destination chahiye aapko? Bata do main itinerary bana deti hoon! 😊", "language": language})
                return

            yield _jl({"type": "tool_step", "message": f"📅 {destination} ke liye {days}-din itinerary bana rahi hoon...", "status": "running"})

            from services.itinerary_service import generate_itinerary
            itinerary = await generate_itinerary(
                destination=destination,
                days=int(days),
                budget_inr=int(budget),
                origin=source,
                travellers=int(travellers),
                month=int(month) if month else None,
                interests=interests,
                language=language,
            )
            yield _jl({"type": "tool_step", "message": "✅ Itinerary ready!", "status": "done"})

            # Human-language intro message
            budget_str = f"₹{budget:,}" if budget else "your budget"
            intro = _itinerary_intro(destination, days, budget_str, source, language)
            yield _jl({"type": "message", "content": intro, "language": language})

            # Emit the full structured itinerary for the ItineraryView component
            yield _jl({"type": "itinerary", "data": itinerary})

            # Generate and emit PDF (non-blocking — if it fails, no problem)
            try:
                import base64
                from services.pdf_service import generate_itinerary_pdf
                pdf_bytes = await generate_itinerary_pdf(itinerary)
                if pdf_bytes:
                    pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
                    yield _jl({
                        "type": "itinerary_pdf",
                        "filename": f"{destination.lower().replace(' ', '_')}_itinerary.pdf",
                        "pdf_base64": pdf_b64,
                    })
                    logger.info(f"PDF emitted for {destination}")
            except Exception as pdf_err:
                logger.warning(f"PDF generation skipped: {pdf_err}")


        # ══════════════════════════════════════════════════════════════════
        # ACTION: ASK_KNOWLEDGE
        # RAG + Tavily web search + Gemini synthesis
        # ══════════════════════════════════════════════════════════════════
        elif turn.action == "ASK_KNOWLEDGE":
            yield _jl({"type": "tool_step", "message": "🔎 Searching for information...", "status": "running"})

            # Enrich query with destination context
            enriched_query = request.message
            if destination:
                enriched_query = f"{enriched_query} [destination: {destination}]"

            rag_result = await rag_answer(enriched_query, language=language)
            answer = rag_result.get("answer", "")
            
            # If RAG gives empty or very short answer, try Tavily
            if not answer or len(answer) < 80:
                try:
                    from services.tavily_service import search as tavily_search
                    tavily_res = await tavily_search(
                        f"{destination} {request.message} India travel guide"
                    )
                    if tavily_res:
                        answer = tavily_res[0].get("content", answer)
                        yield _jl({
                            "type": "knowledge_message",
                            "content": answer,
                            "source_type": "web",
                            "web_sources": [{"url": r["url"], "title": r.get("title", "")} for r in tavily_res[:3]],
                            "language": language,
                        })
                        return
                except Exception as tav_err:
                    logger.warning(f"Tavily fallback failed: {tav_err}")

            yield _jl({"type": "tool_step", "message": "✅ Information ready!", "status": "done"})

            yield _jl({
                "type":                 "knowledge_message",
                "content":              answer,
                "language":             language,
                "source_type":          rag_result.get("source_type"),
                "sources":              rag_result.get("sources", []),
                "web_sources":          rag_result.get("web_sources", []),
                "last_updated":         rag_result.get("last_updated"),
                "retrieval_confidence": rag_result.get("retrieval_confidence"),
                "used_tavily":          rag_result.get("used_tavily"),
            })

        # ══════════════════════════════════════════════════════════════════
        # ACTION: RECOMMEND_DESTINATIONS
        # Show diverse destination suggestions + cards
        # ══════════════════════════════════════════════════════════════════
        elif turn.action == "RECOMMEND_DESTINATIONS":
            yield _jl({"type": "message", "content": turn.user_facing_message, "language": language})
            # Show cards for 2-3 different destinations
            recommended_names = []
            if turn.nlu.get("entities", {}).get("recommended_destinations"):
                recommended_names = turn.nlu["entities"]["recommended_destinations"]
                
            if not recommended_names:
                recommended_names = ["Kasol", "Coorg", "Rishikesh"]
                
            try:
                from services.destination_card_service import get_destination_cards
                for dest in recommended_names[:3]:
                    cards = await get_destination_cards(dest)
                    if cards:
                        yield _jl({"type": "destination_cards", "destination": dest, "cards": cards[:3]})
            except Exception:
                pass

        # ══════════════════════════════════════════════════════════════════
        # ACTION: REPLAN (change hotel / travel / activity / full replan)
        # ══════════════════════════════════════════════════════════════════
        elif turn.action in ("CHANGE_HOTEL", "CHANGE_TRAVEL", "CHANGE_ACTIVITY", "UPDATE_BUDGET", "REPLAN_ALL"):
            yield _jl({"type": "tool_step", "message": "🔄 Replanning based on your request...", "status": "running"})
            try:
                plans, diff = await ReplanService.handle_replan(request.trip_id, turn.action, state)
                yield _jl({"type": "tool_step", "message": f"✅ {len(plans)} new options ready!", "status": "done"})
                yield _jl({"type": "message", "content": turn.user_facing_message, "language": language})
                if diff:
                    yield _jl({"type": "replan_diff", "data": diff})
                if plans:
                    yield _jl({"type": "plans", "data": [p.model_dump(mode="json") for p in plans]})
            except Exception as exc:
                logger.error(f"Replan failed: {exc}")
                yield _jl({"type": "message", "content": "Replan mein problem aa gayi. Please try again!", "language": language})

        # ══════════════════════════════════════════════════════════════════
        # ACTION: GET_WEATHER
        # ══════════════════════════════════════════════════════════════════
        elif turn.action == "GET_WEATHER":
            if not destination:
                yield _jl({"type": "message", "content": turn.user_facing_message or "Kaunsi jagah ka weather chahiye?", "language": language})
            else:
                yield _jl({"type": "tool_step", "message": f"🌤 {destination} ka weather dekh rahi hoon...", "status": "running"})
                try:
                    from services.weather_service import get_weather
                    weather_res = await get_weather(destination, language=language)
                    yield _jl({"type": "tool_step", "message": "✅ Weather update ready!", "status": "done"})
                    yield _jl({
                        "type": "weather_message",
                        "content": weather_res.summary,
                        "language": language,
                        "data": weather_res.model_dump(mode="json"),
                    })
                except Exception as exc:
                    logger.error(f"Weather service failed: {exc}")
                    yield _jl({"type": "message", "content": f"Weather data nahi mila right now. Try again later!", "language": language})

        # ══════════════════════════════════════════════════════════════════
        # ACTION: CONFIRM_BOOKING
        # ══════════════════════════════════════════════════════════════════
        elif turn.action == "CONFIRM_BOOKING":
            yield _jl({"type": "message", "content": turn.user_facing_message, "language": language})

        # ══════════════════════════════════════════════════════════════════
        # ACTION: PACKING LIST / DOCUMENTS / FLIGHT STATUS
        # ══════════════════════════════════════════════════════════════════
        elif turn.action == "GET_PACKING_LIST":
            if not request.trip_id:
                yield _jl({"type": "message", "content": "Pehle trip finalize karo, phir main packing list bana deti hoon!", "language": language})
            else:
                try:
                    from services.companion_service import generate_packing_checklist
                    checklist = await generate_packing_checklist(request.trip_id)
                    yield _jl({
                        "type": "companion_message",
                        "companion_type": "packing_list",
                        "data": checklist.model_dump(mode="json"),
                        "content": "Yeh rahi aapki packing list! ✅",
                        "language": language,
                    })
                except Exception as exc:
                    logger.error(f"Packing list failed: {exc}")
                    yield _jl({"type": "message", "content": "Packing list generate nahi ho payi. Try again!", "language": language})

        elif turn.action == "GET_DOCUMENT":
            if not request.trip_id:
                yield _jl({"type": "message", "content": "Trip ID chahiye documents ke liye.", "language": language})
            else:
                try:
                    from services.companion_service import get_documents
                    docs = await get_documents(request.trip_id, request.user_id)
                    yield _jl({
                        "type": "companion_message",
                        "companion_type": "documents",
                        "data": [d.model_dump(mode="json") for d in docs],
                        "content": "Yeh rahe aapke trip documents.",
                        "language": language,
                    })
                except Exception as exc:
                    logger.error(f"Documents failed: {exc}")
                    yield _jl({"type": "message", "content": "Documents load nahi ho payi. Try again!", "language": language})

        elif turn.action == "GET_FLIGHT_STATUS":
            if not request.trip_id:
                yield _jl({"type": "message", "content": "Flight status ke liye trip ID chahiye.", "language": language})
            else:
                try:
                    from services.companion_service import get_flight_status
                    status = await get_flight_status(request.trip_id)
                    if status:
                        yield _jl({
                            "type": "companion_message",
                            "companion_type": "flight_status",
                            "data": status.model_dump(mode="json"),
                            "content": f"Flight {status.flight_number} — {status.status_label}.",
                            "language": language,
                        })
                    else:
                        yield _jl({"type": "message", "content": "Flight status abhi available nahi hai.", "language": language})
                except Exception as exc:
                    logger.error(f"Flight status failed: {exc}")
                    yield _jl({"type": "message", "content": "Flight status check nahi ho payi.", "language": language})

        # ══════════════════════════════════════════════════════════════════
        # ACTION: SHOW_PANORAMA
        # 360° panoramic virtual tour of an Indian location
        # ══════════════════════════════════════════════════════════════════
        elif turn.action in ("SHOW_PANORAMA", "SHOW_PANORAMA"):
            from services.panorama_service import (
                search_scene, get_related_scenes, generate_tour_narration, build_panorama_event
            )
            from services.llm_provider import get_llm_provider

            # Resolve the place the user asked about
            query_place = destination or request.message
            yield _jl({"type": "tool_step", "message": f"🌐 {query_place} ka 360° view load ho raha hai...", "status": "running"})

            scene = search_scene(query_place)

            if not scene:
                yield _jl({"type": "tool_step", "message": "❌ Scene not found", "status": "error"})
                yield _jl({
                    "type": "message",
                    "content": f"Maafi chahti hoon, abhi {query_place} ka panoramic view available nahi hai. Lekin main jald hi add kar dungi! Koi aur jagah dikhun?",
                    "language": language,
                })
            else:
                # Generate Gemini tour narration
                try:
                    llm = await get_llm_provider()
                    narration = await generate_tour_narration(scene, language, request.message, llm)
                except Exception:
                    narration = scene.get("narration_hint", f"Yeh hai {scene['name']}!")

                related = get_related_scenes(scene["id"])
                event   = build_panorama_event(scene, narration, related)

                yield _jl({"type": "tool_step", "message": f"✅ {scene['name']} ready!", "status": "done"})
                yield _jl(event)

                # Agent intro message
                if language in ("hi", "hinglish"):
                    intro_msg = f"Yeh raha {scene['name']}! 🌐 {scene['city']}, {scene['state']} — 360° view mein. Ghoomiye, zoom kijiye, aur kisi bhi hotspot pe click kijiye!"
                else:
                    intro_msg = f"Here's {scene['name']}! 🌐 Drag to explore the 360° view, click hotspots for details, or ask me anything about this place!"

                yield _jl({"type": "message", "content": intro_msg, "language": language})

        # ══════════════════════════════════════════════════════════════════
        # DEFAULT: plain message
        # ══════════════════════════════════════════════════════════════════
        else:
            yield _jl({"type": "message", "content": turn.user_facing_message, "language": language})


    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── Intro message builder for itinerary ─────────────────────────────────────

def _itinerary_intro(destination: str, days: int, budget: str, origin: str, language: str) -> str:
    if language in ("hi", "hinglish"):
        return (
            f"Bilkul! Maine {origin} se {destination} ke liye {days} din ka full itinerary bana diya hai — "
            f"{budget} budget ke andar. Har din morning se evening tak sab kuch plan hai, "
            f"transport, stay, khana, aur hidden gems bhi! 🗺️✨\n\n"
            f"Neeche se PDF download bhi kar sakte ho."
        )
    return (
        f"Here's your complete {days}-day itinerary from {origin} to {destination} "
        f"within {budget}! Every day is planned hour-by-hour — transport, stays, food, "
        f"activities, and hidden gems included. 🗺️✨\n\nDownload the PDF from below."
    )
