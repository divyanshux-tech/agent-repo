// ============================================================
// src/agents/orchestrator/geminiClient.js
// Gemini API client wrapper using the official @google/genai SDK.
// Supports GEMINI_API_KEY or GOOGLE_AI_API_KEY from process.env
// ============================================================

const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

let ai = null;
const DEFAULT_MODEL = 'gemini-1.5-flash';

function getGeminiClient() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!key || key === 'sk-...' || key.includes('YOUR-')) {
      throw new Error(
        'Missing valid Gemini API Key! Please set GEMINI_API_KEY or GOOGLE_AI_API_KEY in your .env file.'
      );
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

module.exports = { getGeminiClient, DEFAULT_MODEL };
