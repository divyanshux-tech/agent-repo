import os
import logging
from .base_providers import ASRProvider
from groq import AsyncGroq

logger = logging.getLogger(__name__)

class GroqASRProvider(ASRProvider):
    def __init__(self):
        api_key = os.environ.get("GROQ_API_KEY")
        self.client = AsyncGroq(api_key=api_key)
        logger.info("Initialized Groq Whisper ASR Provider")

    async def recognize(self, audio_data: bytes, language: str = None) -> dict:
        try:
            logger.info(f"Sending audio chunk to Groq Whisper ({len(audio_data)} bytes)")
            
            # Whisper requires a filename ending in a supported format like .webm, .wav, or .mp3
            file_tuple = ("audio.webm", audio_data)
            
            transcription = await self.client.audio.transcriptions.create(
                file=file_tuple,
                model="whisper-large-v3",
                response_format="json"
            )
            
            text = transcription.text
            logger.info(f"Groq Transcription: {text}")
            
            return {"text": text, "language": "auto", "confidence": 1.0}
            
        except Exception as e:
            logger.error(f"Groq ASR Error: {e}")
            raise e
