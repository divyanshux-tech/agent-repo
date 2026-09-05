import pytest
import os
import json
import numpy as np
from unittest.mock import patch, MagicMock

# Import the service
from services import rag_service
from services.tavily_service import search_web

@pytest.fixture(autouse=True)
def setup_mock_data():
    # Setup mock chunks
    mock_chunks = [
        {
            "id": "spiti-october",
            "destination": "Spiti Valley",
            "type": "seasonality",
            "content": "October mein Spiti jaana theek hai. The weather is cold but beautiful before snow blocks the roads.",
            "last_updated": "2026-02-01"
        },
        {
            "id": "hampi-fees",
            "destination": "Hampi",
            "type": "entry-fees",
            "content": "Entry fee for Hampi is ₹40 for Indians.",
            "last_updated": "2026-03-01"
        },
        {
            "id": "leh-december",
            "destination": "Leh",
            "type": "accessibility",
            "content": "Leh is highly inaccessible by road in December.",
            "last_updated": "2026-04-01"
        }
    ]
    
    # Mock embeddings to trigger deterministic cosine similarities
    # We will mock the SentenceTransformer entirely inside the test
    rag_service.CHUNKS = mock_chunks
    # We need a 3x3 mock embedding array (just orthogonal vectors for easy testing)
    rag_service.EMBEDDINGS = np.array([
        [1.0, 0.0, 0.0], # Matches Spiti (index 0)
        [0.0, 1.0, 0.0], # Matches Hampi (index 1)
        [0.0, 0.0, 1.0]  # Matches Leh (index 2)
    ])
    
    # Mock the model encoder
    mock_model = MagicMock()
    def mock_encode(texts):
        # Return specific embeddings based on query content
        query = texts[0].lower()
        if "spiti" in query:
            return np.array([[1.0, 0.0, 0.0]])
        elif "hampi" in query:
            return np.array([[0.0, 1.0, 0.0]])
        elif "leh" in query:
            return np.array([[0.0, 0.0, 1.0]])
        else:
            # Fallback for Rohtang/unrelated
            return np.array([[0.1, 0.1, 0.1]]) 
            
    mock_model.encode = mock_encode
    rag_service.MODEL = mock_model
    rag_service.RAG_SIMILARITY_THRESHOLD = 0.4
    
    yield
    
    # Teardown
    rag_service.CHUNKS = []
    rag_service.EMBEDDINGS = None
    rag_service.MODEL = None

@pytest.mark.asyncio
async def test_local_retrieval_spiti():
    response = await rag_service.answer("October mein Spiti jaana theek hai?")
    
    assert response["source_type"] == "local_rag"
    assert "Spiti Valley" in response["sources"]
    assert response["retrieval_confidence"] > 0.4
    assert response["last_updated"] == "2026-02-01"

@pytest.mark.asyncio
async def test_local_retrieval_hampi():
    response = await rag_service.answer("Hampi mein entry fee kitni hai?")
    
    assert response["source_type"] == "local_rag"
    assert "Hampi" in response["sources"]
    assert response["retrieval_confidence"] > 0.4
    assert response["last_updated"] == "2026-03-01"

@pytest.mark.asyncio
async def test_local_retrieval_leh():
    response = await rag_service.answer("Is Leh accessible in December?")
    
    assert response["source_type"] == "local_rag"
    assert "Leh" in response["sources"]
    assert response["retrieval_confidence"] > 0.4
    assert response["last_updated"] == "2026-04-01"

@pytest.mark.asyncio
@patch("services.rag_service.search_web")
async def test_tavily_fallback_unrelated(mock_search_web):
    mock_search_web.return_value = "Mock Web Result for Rohtang"
    
    # Set a high threshold to force the mock cosine similarity (0.577) to fail and trigger Tavily
    rag_service.RAG_SIMILARITY_THRESHOLD = 0.9 
    
    response = await rag_service.answer("What is the current status of Rohtang Pass?")
    
    assert response["source_type"] == "tavily"
    assert response["used_tavily"] is True
