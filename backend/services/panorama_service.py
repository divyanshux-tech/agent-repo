"""
Panorama Service
Loads the curated 200-scene Indian panorama database and provides:
  - Fuzzy scene lookup from user queries (destination names, aliases, tags)
  - Gemini-generated live tour-guide narration (language-aware, Hinglish)
  - Related scenes for hotspot navigation
"""
import json
import logging
import os
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── Load scene database once at import time ──────────────────────────────────
_DATA_PATH = Path(__file__).parent.parent / "data" / "panorama_scenes.json"
try:
    with open(_DATA_PATH, encoding="utf-8") as f:
        _SCENES: list[dict] = json.load(f)
    logger.info(f"Loaded {len(_SCENES)} panorama scenes")
except Exception as e:
    logger.error(f"Failed to load panorama_scenes.json: {e}")
    _SCENES = []

# Pre-build lookup maps
_ID_MAP:   dict[str, dict] = {s["id"]: s for s in _SCENES}

# Tag + alias inverted index
_TERM_MAP: dict[str, dict] = {}
for scene in _SCENES:
    for term in (scene.get("aliases", []) + scene.get("tags", [])):
        _TERM_MAP.setdefault(term.lower(), scene)
    # Also index city name and scene name
    _TERM_MAP.setdefault(scene["name"].lower(), scene)
    _TERM_MAP.setdefault(scene["city"].lower(), scene)


# ── Public API ───────────────────────────────────────────────────────────────

def search_scene(query: str) -> Optional[dict]:
    """
    Find the best matching panorama scene for a natural language query.
    Uses alias/tag fuzzy matching with fallback to token overlap scoring.
    """
    lower = query.lower().strip()

    # 1. Exact alias / tag match
    if lower in _TERM_MAP:
        return _TERM_MAP[lower]

    # 2. Substring match — longest alias first
    best: Optional[dict] = None
    best_len = 0
    for term, scene in _TERM_MAP.items():
        if term in lower and len(term) > best_len:
            best = scene
            best_len = len(term)
    if best:
        return best

    # 3. Token overlap scoring
    tokens = set(re.findall(r"\b\w{3,}\b", lower))
    best_score = 0
    for scene in _SCENES:
        all_terms = " ".join(
            scene.get("aliases", []) + scene.get("tags", []) +
            [scene["name"], scene["city"], scene["state"]]
        ).lower()
        scene_tokens = set(re.findall(r"\b\w{3,}\b", all_terms))
        overlap = len(tokens & scene_tokens)
        if overlap > best_score:
            best_score = overlap
            best = scene

    return best if best_score > 0 else None


def get_scene_by_id(scene_id: str) -> Optional[dict]:
    return _ID_MAP.get(scene_id)


def get_related_scenes(scene_id: str, limit: int = 5) -> list[dict]:
    scene = _ID_MAP.get(scene_id)
    if not scene:
        return []
    result = []
    for rid in scene.get("related_places", [])[:limit]:
        s = _ID_MAP.get(rid)
        if s:
            result.append(s)
    return result


def get_scenes_by_city(city: str, limit: int = 6) -> list[dict]:
    city_l = city.lower()
    return [s for s in _SCENES if s["city"].lower() == city_l][:limit]


def get_scenes_by_category(category: str, limit: int = 6) -> list[dict]:
    cat_l = category.lower()
    return [s for s in _SCENES if s.get("category", "").lower() == cat_l][:limit]


def scene_preview(scene: dict) -> dict:
    """Return a lightweight version of a scene for carousel thumbnails."""
    return {
        "id":          scene["id"],
        "name":        scene["name"],
        "city":        scene["city"],
        "state":       scene["state"],
        "category":    scene.get("category", ""),
        "preview_url": scene.get("preview_url", ""),
    }


# ── Gemini Tour Narration ────────────────────────────────────────────────────

_NARRATION_PROMPT = """\
You are Nura, a warm and knowledgeable Indian female travel guide with an enthusiastic, \
immersive style. You are currently standing at {place} in {city}, {state}, India and \
giving a LIVE VIRTUAL TOUR to the user who is experiencing a 360° panoramic view.

{context_instruction}

NARRATION GUIDELINES:
- Start with an evocative sentence about what the user sees right now in the 360° view
- Give 2-3 fascinating facts that most tourists don't know (specific, vivid, surprising)
- Mention what they should look for in different directions (use north/south or left/right)
- Suggest one sensory detail (smell, sound, feeling)
- End with a natural question or suggestion inviting the user to explore further
- Length: 120-180 words
- Tone: warm, conversational, passionate about India — like a knowledgeable local friend
- If language is Hindi or Hinglish: mix Hindi phrases naturally ("Dekhiye!", "Kitna sundar hai na?", "Yahan ka", "Is jagah ki")
- Do NOT sound like a Wikipedia article — be experiential and personal

Background knowledge: {hint}

Respond ONLY with the narration text. No JSON, no labels, no markdown.
"""


async def generate_tour_narration(
    scene: dict,
    language: str = "en",
    user_context: str = "",
    llm_provider=None,
) -> str:
    """
    Generate Gemini-powered tour guide narration for a panorama scene.
    Falls back to the pre-written narration_hint if Gemini fails.
    """
    if llm_provider is None:
        return scene.get("narration_hint", f"Welcome to {scene['name']}!")

    lang_inst = (
        "Respond in a natural mix of Hindi and English (Hinglish)."
        if language in ("hi", "hinglish")
        else "Respond in English."
    )

    prompt = _NARRATION_PROMPT.format(
        place=scene["name"],
        city=scene["city"],
        state=scene["state"],
        context_instruction=lang_inst,
        hint=scene.get("narration_hint", ""),
    )

    extra = (
        f"\n\nUser context / question: {user_context}" if user_context else ""
    )

    try:
        text = await llm_provider.generate_text(
            system_prompt=prompt + extra,
            user_message="Give me the live tour narration now.",
            temperature=0.85,
            max_tokens=300,
        )
        return text.strip() if text else scene.get("narration_hint", "")
    except Exception as e:
        logger.warning(f"Narration generation failed for {scene['id']}: {e}")
        return scene.get("narration_hint", f"Welcome to {scene['name']}!")


def build_panorama_event(
    scene: dict,
    narration: str,
    related: list[dict],
) -> dict:
    """Build the SSE panorama_view event payload."""
    return {
        "type":            "panorama_view",
        "scene": {
            "id":           scene["id"],
            "name":         scene["name"],
            "city":         scene["city"],
            "state":        scene["state"],
            "category":     scene.get("category", ""),
            "panorama_url": scene.get("panorama_url", ""),
            "preview_url":  scene.get("preview_url", ""),
            "panorama_type": scene.get("type", "equirectangular"),
            "haov":         scene.get("haov", 360),
            "vaov":         scene.get("vaov", 160),
            "hotspots":     scene.get("hotspots", []),
            "lat":          scene.get("lat"),
            "lng":          scene.get("lng"),
        },
        "narration":       narration,
        "related_scenes":  [scene_preview(s) for s in related],
        "quick_actions": [
            {"label": f"{scene['city']} ki trains 🚂",    "query": f"{scene['city']} ki trains batao"},
            {"label": f"Hotels dikhao 🏨",                 "query": f"{scene['city']} mein budget hotels dikhao"},
            {"label": "Aur batao 📖",                      "query": f"{scene['name']} ke baare mein aur batao"},
            {"label": "Khaana kahan khaye 🍽️",            "query": f"{scene['city']} ke best food spots batao"},
            {"label": "Agli jagah dikhao →",               "query": f"agli jagah dikhao"},
        ],
    }
