import logging

logger = logging.getLogger(__name__)

class ResponseFormatter:
    def __init__(self):
        logger.info("Initializing Response Formatter")
        
    def format_for_voice(self, llm_response: str, language: str = "hinglish") -> list:
        """
        Converts markdown lists and dense text into conversational, spoken language.
        Chunks sentences for TTS streaming.
        Example: "### Kerala\n1. Munnar" -> ["Kerala ke liye main Munnar recommend karunga."]
        """
        import re
        
        # Strip URLs
        clean_text = re.sub(r'\[.*?\]\(.*?\)', '', llm_response)
        # Strip markdown bold, italics, headers
        clean_text = clean_text.replace("#", "").replace("*", "")
        # Strip numbered lists
        clean_text = re.sub(r'\d+\.\s*', '', clean_text)
        
        # Remove empty lines
        clean_text = " ".join([line.strip() for line in clean_text.split("\n") if line.strip()])
        
        # Chunking by sentence boundary (. ? !)
        sentences = re.split(r'(?<=[.!?])\s+', clean_text)
        return [s.strip() for s in sentences if s.strip()]
