import asyncio
import json
import logging
import os
from functools import lru_cache
from typing import Any, Optional

import google.generativeai as genai

logger = logging.getLogger(__name__)


class LLMProvider:
    """Single Gemini provider for orchestrator/NLU calls."""

    def __init__(self, model_name: str = "gemini-2.0-flash"):
        self.model_name = model_name
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self._configured = False

    @property
    def is_available(self) -> bool:
        return bool(self.api_key and self.api_key != "your_gemini_api_key")

    def _configure(self) -> None:
        if self._configured or not self.is_available:
            return
        genai.configure(api_key=self.api_key)
        self._configured = True

    async def generate_json(self, system_prompt: str, payload: dict[str, Any]) -> Optional[dict[str, Any]]:
        if not self.is_available:
            return None

        self._configure()
        model = genai.GenerativeModel(
            self.model_name,
            system_instruction=system_prompt,
            generation_config={"response_mime_type": "application/json"},
        )

        try:
            response = await asyncio.to_thread(model.generate_content, json.dumps(payload, ensure_ascii=False))
            return json.loads(response.text)
        except Exception as exc:
            logger.warning("Gemini JSON generation failed: %s", exc)
            return None

    async def generate_text(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        if not self.is_available:
            return None
            
        self._configure()
        model = genai.GenerativeModel(
            self.model_name,
            system_instruction=system_prompt,
        )
        
        try:
            response = await asyncio.to_thread(model.generate_content, user_prompt)
            return response.text
        except Exception as exc:
            logger.warning("Gemini text generation failed: %s", exc)
            return None


@lru_cache(maxsize=1)
def get_llm_provider() -> LLMProvider:
    return LLMProvider()
