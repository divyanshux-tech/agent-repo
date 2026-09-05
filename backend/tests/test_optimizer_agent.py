import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

from agents.optimizer import optimize_trip, _cache
from models.optimizer_schemas import OptimizerRequest

@pytest.fixture(autouse=True)
def clear_cache():
    _cache.clear()

def test_impossibly_low_budget():
    req = OptimizerRequest(
        trip_id="trip-low-budg",
        total_budget_inr=3000,
        destination_slug="goa",
        start_date=datetime(2026, 12, 1).date(),
        end_date=datetime(2026, 12, 5).date(),
        user_interests=["beach"]
    )
    
    plans = optimize_trip(req)
    assert len(plans) == 1
    assert "infeasible_budget" in plans[0].incomplete_components or hasattr(plans[0], "warning")

@patch("agents.optimizer.fetch_candidates")
@patch("agents.optimizer.fetch_estimate")
@patch("agents.optimizer.supabase")
def test_no_travel_or_hotel_components(mock_supabase, mock_fetch_est, mock_fetch_cand):
    # Setup mock candidates
    mock_fetch_cand.return_value = [
        {"id": "A1", "type": "ACTIVITY", "data_json": {"id": "A1", "price_inr": 1000, "type": "ACTIVITY"}},
    ]
    mock_fetch_est.return_value = {"food_estimate_inr": 5000, "local_transport_estimate_inr": 2000}
    
    req = OptimizerRequest(
        trip_id="trip-missing",
        total_budget_inr=50000,
        destination_slug="goa",
        start_date=datetime(2026, 12, 1).date(),
        end_date=datetime(2026, 12, 5).date(),
        user_interests=["beach"]
    )
    
    plans = optimize_trip(req)
    assert len(plans) == 1
    assert "travel" in plans[0].incomplete_components
    assert "hotel" in plans[0].incomplete_components

@patch("agents.optimizer.fetch_candidates")
@patch("agents.optimizer.fetch_estimate")
@patch("agents.optimizer.supabase")
def test_hard_feasibility_filtering(mock_supabase, mock_fetch_est, mock_fetch_cand):
    # Only combination: T1 + H1 = 20000 + 40000 = 60000
    mock_fetch_cand.return_value = [
        {"id": "T1", "type": "FLIGHT", "data_json": {"id": "T1", "type": "FLIGHT", "price_inr": 20000, "duration_minutes": 120}},
        {"id": "H1", "type": "HOTEL", "data_json": {"id": "H1", "type": "HOTEL", "price_total_inr": 40000, "rating": 4.5}}
    ]
    mock_fetch_est.return_value = {"food_estimate_inr": 5000, "local_transport_estimate_inr": 2000}
    
    # Budget is 50000. Total required is 67000.
    req = OptimizerRequest(
        trip_id="trip-feasible",
        total_budget_inr=50000,
        destination_slug="goa",
        start_date=datetime(2026, 12, 1).date(),
        end_date=datetime(2026, 12, 5).date(),
        user_interests=["beach"]
    )
    
    plans = optimize_trip(req)
    # No feasible plans means returns empty list
    assert len(plans) == 0

@patch("agents.optimizer.fetch_candidates")
@patch("agents.optimizer.fetch_estimate")
@patch("agents.optimizer.supabase")
def test_successful_optimization_and_labelling(mock_supabase, mock_fetch_est, mock_fetch_cand):
    # Provide various combos
    mock_fetch_cand.return_value = [
        {"id": "T1", "type": "FLIGHT", "data_json": {"id": "T1", "type": "FLIGHT", "price_inr": 10000, "duration_minutes": 100}},
        {"id": "T2", "type": "TRAIN", "data_json": {"id": "T2", "type": "TRAIN", "price_inr": 2000, "duration_minutes": 800}},
        {"id": "H1", "type": "HOTEL", "data_json": {"id": "H1", "type": "HOTEL", "price_total_inr": 20000, "rating": 5.0}},
        {"id": "H2", "type": "HOTEL", "data_json": {"id": "H2", "type": "HOTEL", "price_total_inr": 10000, "rating": 3.0}},
        {"id": "A1", "type": "ACTIVITY", "data_json": {"id": "A1", "type": "ACTIVITY", "price_inr": 1000, "sustainability_score": 0.9}},
    ]
    mock_fetch_est.return_value = {"food_estimate_inr": 5000, "local_transport_estimate_inr": 2000}
    
    req = OptimizerRequest(
        trip_id="trip-success",
        total_budget_inr=100000,
        destination_slug="goa",
        start_date=datetime(2026, 12, 1).date(),
        end_date=datetime(2026, 12, 5).date(),
        user_interests=["beach"]
    )
    
    plans = optimize_trip(req)
    # We should have multiple plans, up to 5, and they should have distinct labels
    assert len(plans) >= 3
    assert len(plans) <= 5
    
    labels = [p.label for p in plans]
    assert len(set(labels)) == len(labels) # Unique labels
    
    # We definitely should have 'Best Value'
    assert "Best Value" in labels
