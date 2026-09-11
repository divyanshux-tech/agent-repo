import asyncio
import json
import logging
import os
from functools import lru_cache
from typing import Any, Optional

import google.generativeai as genai
from groq import AsyncGroq

logger = logging.getLogger(__name__)

class LLMProvider:
    """Provider for orchestrator/NLU calls, prioritizing Groq for text and Gemini as fallback."""

    def __init__(self, model_name: str = "gemini-robotics-er-2-preview"):
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
        groq_key = os.environ.get("GROQ_API_KEY")
        if groq_key:
            try:
                client = AsyncGroq(api_key=groq_key)
                response = await client.chat.completions.create(
                    model="openai/gpt-oss-20b",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": json.dumps(payload, ensure_ascii=False)}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                )
                return json.loads(response.choices[0].message.content)
            except Exception as exc:
                logger.warning("Groq JSON generation failed, falling back to Gemini: %s", exc)

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
        groq_key = os.environ.get("GROQ_API_KEY")
        if groq_key:
            try:
                client = AsyncGroq(api_key=groq_key)
                response = await client.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7,
                )
                return response.choices[0].message.content
            except Exception as exc:
                logger.warning("Groq text generation failed, falling back to Gemini: %s", exc)

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

    async def generate_text_stream(self, system_prompt: str, user_prompt: str):
        groq_key = os.environ.get("GROQ_API_KEY")
        if groq_key:
            try:
                client = AsyncGroq(api_key=groq_key)
                response = await client.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7,
                    stream=True
                )
                async for chunk in response:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
                return
            except Exception as exc:
                logger.warning("Groq text streaming failed, falling back to Gemini: %s", exc)

        # Fallback to non-streaming Gemini if Groq fails
        res = await self.generate_text(system_prompt, user_prompt)
        if res:
            yield res

@lru_cache(maxsize=1)
def get_llm_provider() -> LLMProvider:
    return LLMProvider()
