import logging
from .providers.bhashini_provider import BhashiniTTSProvider
from .providers.webspeech_provider import WebSpeechASRProvider, WebSpeechTTSProvider
from .providers.groq_provider import GroqASRProvider

logger = logging.getLogger(__name__)

class ProviderManager:
    def __init__(self):
        self.primary_asr = GroqASRProvider()
        self.fallback_asr = WebSpeechASRProvider()
        
        self.primary_tts = BhashiniTTSProvider()
        self.fallback_tts = WebSpeechTTSProvider()

    async def get_asr_result(self, audio_data: bytes, language: str = None) -> dict:
        """Attempts primary ASR, silently falls back if it fails."""
        try:
            return await self.primary_asr.recognize(audio_data, language)
        except Exception as e:
            logger.warning(f"Primary ASR failed: {e}. Falling back to WebSpeech.")
            return await self.fallback_asr.recognize(audio_data, language)

    async def get_tts_result(self, text: str, language: str) -> bytes:
        """Attempts primary TTS, silently falls back if it fails."""
        try:
            return await self.primary_tts.synthesize(text, language)
        except Exception as e:
            logger.warning(f"Primary TTS failed: {e}. Falling back to WebSpeech.")
            return await self.fallback_tts.synthesize(text, language)
