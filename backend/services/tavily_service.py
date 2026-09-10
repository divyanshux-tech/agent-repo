"""
Enhanced Tavily Web Search Service
Returns structured results with titles, URLs, and a synthesized answer.
Used by RAG service as live web fallback.
"""
import os
import logging
import httpx
from typing import Any

logger = logging.getLogger(__name__)


async def search_web(query: str, max_results: int = 5, include_answer: bool = True) -> str:
    """
    Search the web using Tavily API.
    Returns synthesised context string for LLM consumption.
    """
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        logger.warning("TAVILY_API_KEY not set — returning empty context.")
        return ""

    url = "https://api.tavily.com/search"
    payload = {
        "api_key": api_key,
        "query": query,
        "search_depth": "advanced",
        "include_answer": include_answer,
        "include_raw_content": False,
        "max_results": max_results,
        "include_domains": [],          # unrestricted
        "exclude_domains": [],
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        parts = []

        # Direct answer from Tavily (if available)
        if include_answer and data.get("answer"):
            parts.append(f"Summary: {data['answer']}")

        # Individual result snippets
        for res in data.get("results", [])[:max_results]:
            title   = res.get("title", "")
            content = res.get("content", "")
            url_src = res.get("url", "")
            if content:
                parts.append(f"[{title}] {content}\nSource: {url_src}")

        return "\n\n".join(parts) if parts else ""

    except Exception as exc:
        logger.error(f"Tavily search failed: {exc}")
        return ""


async def search_web_structured(query: str, max_results: int = 5) -> dict[str, Any]:
    """
    Returns a dict with:
      answer   : Tavily's direct answer string
      sources  : list of {title, url, snippet}
    """
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        return {"answer": "", "sources": []}

    url = "https://api.tavily.com/search"
    payload = {
        "api_key": api_key,
        "query": query,
        "search_depth": "advanced",
        "include_answer": True,
        "include_raw_content": False,
        "max_results": max_results,
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        sources = [
            {
                "title": r.get("title", ""),
                "url":   r.get("url", ""),
                "snippet": r.get("content", "")[:400],
            }
            for r in data.get("results", [])[:max_results]
        ]
        return {
            "answer":  data.get("answer", ""),
            "sources": sources,
        }

    except Exception as exc:
        logger.error(f"Tavily structured search failed: {exc}")
        return {"answer": "", "sources": []}
