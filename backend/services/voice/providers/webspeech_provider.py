from .base_providers import ASRProvider, TTSProvider
import logging

logger = logging.getLogger(__name__)

class WebSpeechASRProvider(ASRProvider):
    async def recognize(self, audio_data: bytes, language: str = None) -> dict:
        logger.info("Using WebSpeech API ASR (Fallback)")
        return {"text": "Mujhe october mein goa jaana hai", "language": "hinglish", "confidence": 0.80}

class WebSpeechTTSProvider(TTSProvider):
    async def synthesize(self, text: str, language: str) -> bytes:
        logger.info(f"Using WebSpeech API TTS (Fallback) for {language}")
        return b"mock_audio_bytes"
