// Voice Events
export const VoiceEvents = {
  VOICE_SESSION_STARTED: 'VOICE_SESSION_STARTED',
  VOICE_INPUT_STARTED: 'VOICE_INPUT_STARTED',
  VOICE_TRANSCRIPT_PARTIAL: 'VOICE_TRANSCRIPT_PARTIAL',
  VOICE_TRANSCRIPT_FINAL: 'VOICE_TRANSCRIPT_FINAL',
  AGENT_THINKING: 'AGENT_THINKING',
  TOOL_STARTED: 'TOOL_STARTED',
  TOOL_PROGRESS: 'TOOL_PROGRESS',
  TOOL_COMPLETED: 'TOOL_COMPLETED',
  AGENT_RESPONSE_PARTIAL: 'AGENT_RESPONSE_PARTIAL',
  AGENT_RESPONSE_FINAL: 'AGENT_RESPONSE_FINAL',
  VOICE_OUTPUT_STARTED: 'VOICE_OUTPUT_STARTED',
  VOICE_OUTPUT_ENDED: 'VOICE_OUTPUT_ENDED',
  USER_INTERRUPTED: 'USER_INTERRUPTED',
  VOICE_ERROR: 'VOICE_ERROR',
  SESSION_ENDED: 'SESSION_ENDED'
};

class VoiceEventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(data));
  }
}

export const voiceEvents = new VoiceEventEmitter();
