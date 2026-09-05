import os
import httpx
import logging

logger = logging.getLogger(__name__)

async def search_web(query: str, max_results: int = 3) -> str:
    """
    Fallback web search using Tavily API.
    """
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        logger.warning("TAVILY_API_KEY not found in environment. Using mock Tavily response.")
        return "Mock Web Result: I am currently unable to search the live web. Please verify this information manually."
        
    url = "https://api.tavily.com/search"
    payload = {
        "api_key": api_key,
        "query": query,
        "search_depth": "basic",
        "include_answer": False,
        "max_results": max_results
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            results = data.get("results", [])
            if not results:
                return "No relevant web information found."
                
            snippets = [f"- {res.get('content')}" for res in results]
            return "\n".join(snippets)
            
    except Exception as e:
        logger.error(f"Tavily search failed: {e}")
        return "Web search failed due to an error."
