import pytest
from unittest.mock import patch
import time

from agents.expense import estimate_trip_expenses, _cache
from models.expense_schemas import ExpenseEstimateRequest

MOCK_PROFILES = [
    {
        "slug": "goa",
        "display_name": "Goa",
        "region_type": "beach",
        "food_per_day_inr": 800,
        "local_transport_per_day_inr": 400,
        "notes": "Test profile."
    },
    {
        "slug": "default",
        "display_name": "Default Destination",
        "region_type": "default",
        "food_per_day_inr": 600,
        "local_transport_per_day_inr": 400,
        "notes": "Fallback."
    }
]

@pytest.fixture
def mock_load_profiles():
    with patch("agents.expense.load_profiles", return_value=MOCK_PROFILES) as mock:
        yield mock
        
@pytest.fixture(autouse=True)
def clear_cache():
    _cache.clear()

def test_expense_standard_calculations(mock_load_profiles):
    req = ExpenseEstimateRequest(
        trip_id="test-trip-1",
        destination_slug="goa",
        nights=3,
        travellers=2,
        spending_style="standard"
    )
    
    # expected:
    # standard mult = 1.5
    # travellers = 2 -> share_factor = 1.0
    # food = 800 * 3 * 2 * 1.5 = 7200
    # transport = 400 * 3 * 1.0 * 1.5 = 1800
    # total = 9000
    
    res = estimate_trip_expenses(req)
    assert res.breakdown.food_estimate_inr == 7200
    assert res.breakdown.local_transport_estimate_inr == 1800
    assert res.total_estimate_inr == 9000
    assert res.confidence == "medium"
    assert res.estimation_method == "profile:goa:standard:1.5x"
    assert res.is_estimate is True

def test_expense_budget_solo(mock_load_profiles):
    req = ExpenseEstimateRequest(
        trip_id="test-trip-2",
        destination_slug="goa",
        nights=5,
        travellers=1,
        spending_style="budget"
    )
    
    # expected:
    # budget mult = 1.0
    # travellers = 1 -> share_factor = 0.7
    # food = 800 * 5 * 1 * 1.0 = 4000
    # transport = 400 * 5 * 0.7 * 1.0 = 1400
    # total = 5400
    
    res = estimate_trip_expenses(req)
    assert res.breakdown.food_estimate_inr == 4000
    assert res.breakdown.local_transport_estimate_inr == 1400
    assert res.total_estimate_inr == 5400

def test_expense_premium_large_group(mock_load_profiles):
    req = ExpenseEstimateRequest(
        trip_id="test-trip-3",
        destination_slug="goa",
        nights=4,
        travellers=5,
        spending_style="premium"
    )
    
    # expected:
    # premium mult = 2.5
    # travellers = 5 -> share_factor = 1.8
    # food = 800 * 4 * 5 * 2.5 = 40000
    # transport = 400 * 4 * 1.8 * 2.5 = 7200
    # total = 47200
    
    res = estimate_trip_expenses(req)
    assert res.breakdown.food_estimate_inr == 40000
    assert res.breakdown.local_transport_estimate_inr == 7200
    assert res.total_estimate_inr == 47200

def test_expense_fallback(mock_load_profiles):
    req = ExpenseEstimateRequest(
        trip_id="test-trip-4",
        destination_slug="unknown-place",
        nights=2,
        travellers=2,
        spending_style="budget"
    )
    
    # fallback default profile: 600 food, 400 transport
    res = estimate_trip_expenses(req)
    assert res.confidence == "low"
    assert res.estimation_method == "profile:default:budget:1.0x"
    assert res.breakdown.food_estimate_inr == 600 * 2 * 2 * 1.0  # 2400
    assert res.breakdown.local_transport_estimate_inr == 400 * 2 * 1.0 * 1.0  # 800

def test_expense_idempotency_cache(mock_load_profiles):
    req = ExpenseEstimateRequest(
        trip_id="test-trip-5",
        destination_slug="goa",
        nights=3,
        travellers=2,
        spending_style="standard"
    )
    
    res1 = estimate_trip_expenses(req)
    assert mock_load_profiles.call_count == 1
    
    # Call again with identical req
    res2 = estimate_trip_expenses(req)
    
    # Should not call load_profiles again (should return from cache)
    assert mock_load_profiles.call_count == 1
    assert res1 == res2

def test_expense_bounds_clamping(mock_load_profiles):
    # Test max bound: max is nights * travellers * 15000 = 1 * 1 * 15000 = 15000
    # With a massive fake profile (we'll just use a huge multiplier logic bypass by passing 100 nights)
    # Let's mock a very expensive calculation:
    
    req = ExpenseEstimateRequest(
        trip_id="test-trip-6",
        destination_slug="goa",
        nights=10,
        travellers=1,
        spending_style="premium"
    )
    
    # Actually wait, premium goa for 10 nights, 1 person:
    # food = 800 * 10 * 1 * 2.5 = 20000
    # max allowed for 10 nights, 1 person = 10 * 1 * 15000 = 150000. It won't hit max.
    # To hit max bound, let's fake a very expensive default
    with patch("agents.expense.STYLE_MULTIPLIERS", {"premium": 500.0}):
        res = estimate_trip_expenses(req)
        # Expected max = 10 * 1 * 15000 = 150000
        assert res.total_estimate_inr == 150000
        
    with patch("agents.expense.STYLE_MULTIPLIERS", {"budget": 0.001}):
        req2 = ExpenseEstimateRequest(
            trip_id="test-trip-7",
            destination_slug="goa",
            nights=10,
            travellers=1,
            spending_style="budget"
        )
        res2 = estimate_trip_expenses(req2)
        # Expected min = nights * 200 = 10 * 200 = 2000
        assert res2.total_estimate_inr == 2000
