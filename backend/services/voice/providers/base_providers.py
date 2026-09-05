from abc import ABC, abstractmethod

class ASRProvider(ABC):
    @abstractmethod
    async def recognize(self, audio_data: bytes, language: str = None) -> dict:
        """
        Transcribe audio to text.
        Returns dict with: {"text": str, "language": str, "confidence": float}
        """
        pass

class TTSProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str, language: str) -> bytes:
        """
        Convert text to speech audio bytes.
        """
        pass
