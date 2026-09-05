import logging

logger = logging.getLogger(__name__)

class LanguageService:
    async def detect_language(self, transcript: str) -> dict:
        """
        Detects the primary language of the transcript and travel vocabulary presence.
        Returns a structured dict with confidence and code-mixing info.
        """
        # Mock logic based on prompt
        return {
            "language": "hinglish",
            "confidence": 0.94,
            "is_code_mixed": True
        }
