"""
Enhanced RAG Service
Retrieves from local vector store first; falls back to Tavily web search.
Gemini 2.0 Flash synthesises a rich, human-sounding travel answer.
"""
import json
import os
import numpy as np
import logging
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from .tavily_service import search_web

logger = logging.getLogger(__name__)

CHUNKS = []
EMBEDDINGS = None
MODEL = None
RAG_SIMILARITY_THRESHOLD = 0.4


def load_embeddings_at_startup():
    global CHUNKS, EMBEDDINGS, MODEL
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    chunks_path = os.path.join(data_dir, "knowledge_chunks.json")
    embeddings_path = os.path.join(data_dir, "embeddings.npy")

    try:
        with open(chunks_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        CHUNKS = data.get("chunks", [])

        if os.path.exists(embeddings_path):
            EMBEDDINGS = np.load(embeddings_path)

        logger.info("Initializing SentenceTransformer for RAG...")
        MODEL = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
        logger.info(f"RAG Service initialized with {len(CHUNKS)} chunks.")
    except Exception as e:
        logger.error(f"Failed to load embeddings: {e}")


async def answer(query: str, top_k: int = 3, language: str = "en") -> dict:
    global CHUNKS, EMBEDDINGS, MODEL

    source_type = "tavily"
    sources = []
    web_sources = []
    max_score = 0.0
    last_updated = None
    context = ""

    # ── Step 1: Try local vector store ──────────────────────────────────────
    if MODEL is None or EMBEDDINGS is None or len(CHUNKS) == 0:
        logger.warning("RAG not initialized. Falling back to Tavily.")
        context = await search_web(query)
    else:
        query_embedding = MODEL.encode([query])[0]
        q_norm = np.linalg.norm(query_embedding)
        e_norm = np.linalg.norm(EMBEDDINGS, axis=1)
        similarities = np.dot(EMBEDDINGS, query_embedding) / (e_norm * q_norm + 1e-8)

        top_indices = np.argsort(similarities)[::-1][:top_k]
        top_scores = similarities[top_indices]
        max_score = float(top_scores[0]) if len(top_scores) > 0 else 0.0
        logger.info(f"RAG similarity score: {max_score:.3f}")

        if max_score < RAG_SIMILARITY_THRESHOLD:
            logger.info("Low similarity — falling back to Tavily.")
            context = await search_web(query)
        else:
            source_type = "local_rag"
            retrieved_chunks = [CHUNKS[i] for i in top_indices]
            retrieved = [chunk["content"] for chunk in retrieved_chunks]
            sources = list(set([chunk["destination"] for chunk in retrieved_chunks]))
            last_updated = retrieved_chunks[0].get("last_updated") if retrieved_chunks else None
            context = "\n".join(retrieved)

    # ── Step 2: Get Tavily structured sources for UI chips ───────────────────
    if source_type == "tavily":
        try:
            from services.tavily_service import search_web_structured
            tavily_data = await search_web_structured(query, max_results=4)
            web_sources = tavily_data.get("sources", [])
            if tavily_data.get("answer"):
                context = tavily_data["answer"] + "\n\n" + context
        except Exception:
            pass

    # ── Step 3: Gemini synthesis — rich, human-sounding answer ───────────────
    lang_hint = "Reply in Hindi/Hinglish" if language in ["hi", "hinglish"] else "Reply in English"
    synthesis_prompt = f"""You are Nura, India's most knowledgeable travel expert.
Answer the travel question below. Be warm, specific, and practical — like a well-travelled friend.

Guidelines:
- Use actual place names, route details, and costs from the context
- For route questions: give specific bus stand names, timing, and fares
- For "what to do" questions: give 3-5 activities with one-line descriptions
- For budget questions: give realistic INR breakdowns
- If context lacks info, give your best general advice honestly
- {lang_hint}. Match the user's language style.
- Format with bullet points or numbered lists where helpful
- Keep response under 250 words

Context:
{context[:3000]}

User question: {query}

Answer:"""

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        response_text = context or "Sorry, I couldn't find specific information for this query right now."
    else:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                "gemini-2.0-flash",
                generation_config=genai.types.GenerationConfig(temperature=0.55),
            )
            response = await model.generate_content_async(synthesis_prompt)
            response_text = response.text.strip()
        except Exception as exc:
            logger.error(f"Gemini RAG synthesis failed: {exc}")
            response_text = context or "Sorry, I ran into an error generating the answer."

    return {
        "answer": response_text,
        "source_type": source_type,
        "sources": sources,
        "web_sources": web_sources,
        "retrieval_confidence": max_score,
        "last_updated": last_updated,
        "used_tavily": source_type == "tavily",
    }