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

async def answer(query: str, top_k: int = 3) -> dict:
    global CHUNKS, EMBEDDINGS, MODEL
    
    source_type = "tavily"
    sources = []
    max_score = 0.0
    last_updated = None
    
    if MODEL is None or EMBEDDINGS is None or len(CHUNKS) == 0:
        logger.warning("RAG not fully initialized. Falling back to Tavily.")
        context = await search_web(query)
    else:
        # 1. Embed query
        query_embedding = MODEL.encode([query])[0]
        
        # 2. Cosine similarity
        q_norm = np.linalg.norm(query_embedding)
        e_norm = np.linalg.norm(EMBEDDINGS, axis=1)
        similarities = np.dot(EMBEDDINGS, query_embedding) / (e_norm * q_norm)
        
        # 3. Get Top-K
        top_indices = np.argsort(similarities)[::-1][:top_k]
        top_scores = similarities[top_indices]
        
        max_score = float(top_scores[0]) if len(top_scores) > 0 else 0.0
        logger.info(f"RAG Max Similarity Score: {max_score:.3f}")
        
        if max_score < RAG_SIMILARITY_THRESHOLD:
            logger.info("Retrieval confidence too low. Falling back to Tavily.")
            context = await search_web(query)
        else:
            source_type = "local_rag"
            retrieved_chunks = [CHUNKS[i] for i in top_indices]
            retrieved = [chunk["content"] for chunk in retrieved_chunks]
            sources = list(set([chunk["destination"] for chunk in retrieved_chunks]))
            
            # Find the most recent date from chunks, or just the first one
            last_updated = retrieved_chunks[0].get("last_updated") if retrieved_chunks else None
            context = "\n".join(retrieved)
            
    # Gemini Generation
    prompt = f"""Answer the travel question using ONLY the provided context. 
If the answer is not in the context, say clearly "I don't have specific 
information about this — let me search for current details."
Do NOT make up facts. Entry fees, timings, and accessibility dates 
must come from the context, not from training data.

Context retrieved:
{context}

User question: {query}
User language: en

Answer in en. Be conversational and helpful. 
Include practical advice alongside factual information.
Keep the answer under 150 words."""

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key":
        response_text = f"MOCK RAG ANSWER:\nBased on context:\n{context}"
    else:    
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(prompt)
            response_text = response.text
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            response_text = "Sorry, I encountered an error while generating the answer."
            
    return {
        "answer": response_text,
        "source_type": source_type,
        "sources": sources,
        "retrieval_confidence": max_score,
        "last_updated": last_updated,
        "used_tavily": source_type == "tavily"
    }