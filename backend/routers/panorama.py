"""
Panorama REST router
  GET /api/panorama/scene/{scene_id}  — fetch scene + narration for panel navigation
  GET /api/panorama/search?q=...       — search scenes by query
  GET /api/panorama/list               — list all scenes (light preview)
"""
import logging

from fastapi import APIRouter, HTTPException, Query

from services.panorama_service import (
    build_panorama_event,
    generate_tour_narration,
    get_related_scenes,
    get_scene_by_id,
    scene_preview,
    search_scene,
    _SCENES,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/scene/{scene_id}")
async def get_panorama_scene(scene_id: str, lang: str = "en"):
    scene = get_scene_by_id(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene '{scene_id}' not found")

    try:
        from services.llm_provider import get_llm_provider
        llm = await get_llm_provider()
        narration = await generate_tour_narration(scene, lang, "", llm)
    except Exception:
        narration = scene.get("narration_hint", f"Welcome to {scene['name']}!")

    related = get_related_scenes(scene_id)
    event   = build_panorama_event(scene, narration, related)
    return event


@router.get("/search")
async def search_panorama(q: str = Query(..., min_length=2)):
    scene = search_scene(q)
    if not scene:
        raise HTTPException(status_code=404, detail="No matching scene found")
    return scene_preview(scene)


@router.get("/list")
async def list_scenes():
    return [scene_preview(s) for s in _SCENES]
