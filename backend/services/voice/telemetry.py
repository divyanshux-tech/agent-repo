import time
import logging

logger = logging.getLogger(__name__)

class VoiceTelemetry:
    def __init__(self, session_id: str, turn_id: str):
        self.session_id = session_id
        self.turn_id = turn_id
        self.metrics = {}
        
    def mark(self, event_name: str):
        self.metrics[event_name] = time.time()
        
    def log_report(self):
        try:
            asr_start = self.metrics.get("asr_start", 0)
            asr_final = self.metrics.get("asr_final", 0)
            llm_first_token = self.metrics.get("llm_first_token", 0)
            tts_start = self.metrics.get("tts_start", 0)
            tts_first_audio = self.metrics.get("tts_first_audio", 0)
            
            asr_latency = asr_final - asr_start if asr_start and asr_final else 0
            time_to_first_audio = tts_first_audio - asr_final if asr_final and tts_first_audio else 0
            
            logger.info(
                f"[Telemetry] Session: {self.session_id} Turn: {self.turn_id}\n"
                f"  ASR Latency: {asr_latency:.3f}s\n"
                f"  Time to First Audio: {time_to_first_audio:.3f}s"
            )
        except Exception as e:
            logger.error(f"Error calculating telemetry: {e}")
