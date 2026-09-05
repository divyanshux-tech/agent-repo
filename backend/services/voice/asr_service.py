from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class ASRProvider(ABC):
    @abstractmethod
    async def process_audio_chunk(self, audio_chunk: bytes) -> dict:
        """
        Processes an audio chunk and returns interim or final transcription.
        Format: {"transcript": str, "is_final": bool, "language": str, "confidence": float}
        """
        pass

class BhashiniASRProvider(ASRProvider):
    def __init__(self):
        # Initialize Bhashini API keys and connections here
        logger.info("Initializing Bhashini ASR Provider")
        
    async def process_audio_chunk(self, audio_chunk: bytes) -> dict:
        # TODO: Implement actual Bhashini integration
        return {
            "transcript": "mock transcript",
            "is_final": False,
            "language": "hi",
            "confidence": 0.0
        }

class WebSpeechASRProvider(ASRProvider):
    def __init__(self):
        logger.info("Initializing Web Speech ASR Provider (Fallback)")
        
    async def process_audio_chunk(self, audio_chunk: bytes) -> dict:
        # Web Speech ASR happens on the client side, so the backend just receives the final text.
        # This provider is mostly a pass-through for client-provided transcripts.
        pass

def get_asr_provider(provider_name: str = "bhashini") -> ASRProvider:
    if provider_name == "bhashini":
        return BhashiniASRProvider()
    return WebSpeechASRProvider()
