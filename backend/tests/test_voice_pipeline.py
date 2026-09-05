import pytest
import asyncio
from services.conversation.intent_parser import IntentParser
from services.voice.language_service import LanguageService
from services.conversation.ambiguity_manager import AmbiguityManager

@pytest.mark.asyncio
async def test_language_detection_hinglish():
    service = LanguageService()
    result = await service.detect_language("Mujhe October mein Kerala jaana hai budget 30k hai.")
    assert result["language"] == "hinglish"
    assert result["is_code_mixed"] == True

@pytest.mark.asyncio
async def test_intent_parsing_travel():
    parser = IntentParser()
    result = await parser.parse_turn("Next Friday goa jaana hai")
    assert result["intent"] == "PLAN_TRIP"
    assert "destination" in result["entities"]
    
@pytest.mark.asyncio
async def test_ambiguity_resolution():
    manager = AmbiguityManager()
    entities = {"origin": {"raw": "Bombay"}}
    
    # Check if Bombay gets correctly resolved to Mumbai via geocoding mock
    entities["origin"].update(manager.resolve_geocoding(entities["origin"]["raw"]))
    assert entities["origin"]["resolved"] == "Mumbai, Maharashtra"

@pytest.mark.asyncio
async def test_missing_budget_clarification():
    manager = AmbiguityManager()
    entities = {"destination": {"resolved": "Goa"}}
    context = {}
    
    clarifications = manager.evaluate_entities(entities, context)
    assert len(clarifications) > 0
    assert "budget" in clarifications[0].lower() or "kahan se" in clarifications[0].lower()
