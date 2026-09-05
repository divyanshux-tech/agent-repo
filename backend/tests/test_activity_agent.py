import pytest
from unittest.mock import patch
from datetime import datetime

from agents.activity import search_activities, get_featured_activities
from models.candidate import ActivityCandidate

# A mock catalog matching the structure used in the real implementation
MOCK_CATALOG = [
    {
        "id": "test-activity-1",
        "name": "Test Easy Activity",
        "regions": ["goa", "mumbai"],
        "state": "Goa",
        "categories": ["adventure", "beach"],
        "season_months": [1, 2, 3, 10, 11, 12],
        "difficulty": "easy",
        "price_band_inr": 1000,
        "duration_hrs": 2.0
    },
    {
        "id": "test-activity-2",
        "name": "Test Expert Activity",
        "regions": ["goa"],
        "state": "Goa",
        "categories": ["adventure"],
        "season_months": [10, 11, 12],
        "difficulty": "expert",
        "price_band_inr": 5000,
        "duration_hrs": 6.0
    },
    {
        "id": "test-activity-3",
        "name": "Test Summer Activity",
        "regions": ["goa"],
        "state": "Goa",
        "categories": ["cultural"],
        "season_months": [4, 5, 6],
        "difficulty": "moderate",
        "price_band_inr": 2000,
        "duration_hrs": 3.0
    },
    {
        "id": "test-activity-4",
        "name": "Test Expensive Activity",
        "regions": ["goa"],
        "state": "Goa",
        "categories": ["wellness"],
        "season_months": [1, 2, 12],
        "difficulty": "easy",
        "price_band_inr": 20000,
        "duration_hrs": 2.0
    }
]

@pytest.fixture
def mock_load_catalog():
    with patch("agents.activity.load_catalog", return_value=MOCK_CATALOG) as mock:
        yield mock

@pytest.mark.asyncio
async def test_search_activities_filters_and_scoring(mock_load_catalog):
    # Test 1: Happy path, Goa in December, budget is huge, 2 travellers
    # Expected: Should return Activity 1 (Easy). Activity 2 (Expert) is excluded by default.
    # Activity 3 is wrong season. Activity 4 is returned.
    results = await search_activities(
        destination="goa",
        month=12,
        travellers=2,
        remaining_budget_inr=100000,
        interests=["adventure"],
        difficulty_max=None,
        trip_id=None
    )
    
    assert len(results) == 2
    
    # Check soft scoring: Activity 1 matches "adventure", Activity 4 doesn't match
    acts_dict = {r.source_reference: r for r in results}
    assert acts_dict["test-activity-1"].interest_match_score > 0
    assert acts_dict["test-activity-4"].interest_match_score == 0

@pytest.mark.asyncio
async def test_search_activities_difficulty(mock_load_catalog):
    # Test: specifically request expert difficulty
    results = await search_activities(
        destination="goa",
        month=12,
        travellers=2,
        remaining_budget_inr=100000,
        interests=[],
        difficulty_max="expert",
        trip_id=None
    )
    
    assert len(results) == 3
    assert any(r.source_reference == "test-activity-2" for r in results)

@pytest.mark.asyncio
async def test_search_activities_budget(mock_load_catalog):
    # Test: budget is too low for the expensive activity (20000 * 2 = 40000)
    results = await search_activities(
        destination="goa",
        month=12,
        travellers=2,
        remaining_budget_inr=10000,
        interests=[],
        difficulty_max=None,
        trip_id=None
    )
    
    assert len(results) == 1
    assert results[0].source_reference == "test-activity-1"

@pytest.mark.asyncio
async def test_search_activities_season(mock_load_catalog):
    # Test: Month is May (5). Only summer activity should appear.
    results = await search_activities(
        destination="goa",
        month=5,
        travellers=1,
        remaining_budget_inr=10000,
        interests=[],
        difficulty_max=None,
        trip_id=None
    )
    
    assert len(results) == 1
    assert results[0].source_reference == "test-activity-3"

def test_get_featured_activities(mock_load_catalog):
    featured = get_featured_activities(month=12, count=2)
    assert len(featured) == 2
    for f in featured:
        assert 12 in f["season_months"]
