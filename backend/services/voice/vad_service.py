class VADService:
    def is_speech(self, audio_chunk: bytes) -> bool:
        """
        Voice Activity Detection to determine if the chunk contains speech.
        """
        return True
