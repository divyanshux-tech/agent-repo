from typing import Any, Dict, Optional

from services.conversation.nlu_schema import NLUInput
from services.conversation.nlu_service import NLUService


class IntentParser:
    """Compatibility wrapper around the shared Feature 2 NLU service."""

    def __init__(self, nlu_service: Optional[NLUService] = None):
        self.nlu_service = nlu_service or NLUService()

    async def parse_turn(
        self,
        transcript: str,
        language: str = "hinglish",
        current_state: Optional[dict[str, Any]] = None,
        conversation_history: Optional[list[Any]] = None,
    ) -> Dict[str, Any]:
        nlu_input = NLUInput(
            transcript=transcript,
            language=language,
            is_code_mixed=language in {"hinglish", "hi-en"},
        )
        result = await self.nlu_service.parse_turn(nlu_input, current_state, conversation_history)
        return {
            "intent": result.intent.value,
            "action": result.action.value,
            "confidence": result.confidence,
            "language": result.language,
            "is_code_mixed": result.is_code_mixed,
            "entities": result.entities.model_dump(mode="json"),
            "state_updates": result.state_updates,
            "missing_required_fields": result.missing_required_fields,
            "requires_clarification": result.requires_clarification,
            "next_question": result.next_question,
            "user_facing_message": result.user_facing_message,
        }
