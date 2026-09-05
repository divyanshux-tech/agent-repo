import pytest
from pydantic import ValidationError
from models.itinerary_schemas import ItinerarySlot, ItineraryDay

def test_slot_time_validation():
    # TEST 1: valid time
    slot = ItinerarySlot(
        time="08:00",
        end_time="09:00",
        type="travel",
        title="Test",
        description="Test description",
        estimated_spend_inr=0
    )
    assert slot.time == "08:00"

    # end_time must be after time
    with pytest.raises(ValidationError):
        ItinerarySlot(
            time="09:00",
            end_time="08:00",
            type="travel",
            title="Test",
            description="Test description",
            estimated_spend_inr=0
        )

def test_slot_type_validation():
    # TEST 2: invalid slot type
    with pytest.raises(ValidationError):
        ItinerarySlot(
            time="08:00",
            type="invalid_type",
            title="Test",
            description="Test description",
            estimated_spend_inr=0
        )

def test_day_spend_equals_slot_sum():
    # TEST 4: Day spend must equal slot sum
    s1 = ItinerarySlot(time="08:00", type="food", title="T1", description="D1", estimated_spend_inr=100)
    s2 = ItinerarySlot(time="10:00", type="activity", title="T2", description="D2", estimated_spend_inr=200)
    s3 = ItinerarySlot(time="12:00", type="travel", title="T3", description="D3", estimated_spend_inr=50)
    s4 = ItinerarySlot(time="14:00", type="explore", title="T4", description="D4", estimated_spend_inr=0)

    # Valid
    day = ItineraryDay(
        day=1,
        date="2026-10-10",
        title="Day 1",
        slots=[s1, s2, s3, s4],
        estimated_spend_today_inr=350
    )
    assert day.estimated_spend_today_inr == 350

    # Invalid
    with pytest.raises(ValidationError):
        ItineraryDay(
            day=1,
            date="2026-10-10",
            title="Day 1",
            slots=[s1, s2, s3, s4],
            estimated_spend_today_inr=500
        )

def test_chronological_ordering():
    # TEST 5: Chronological slots
    s1 = ItinerarySlot(time="10:00", type="food", title="T1", description="D1", estimated_spend_inr=100)
    s2 = ItinerarySlot(time="08:00", type="activity", title="T2", description="D2", estimated_spend_inr=200)
    s3 = ItinerarySlot(time="12:00", type="travel", title="T3", description="D3", estimated_spend_inr=50)
    s4 = ItinerarySlot(time="14:00", type="explore", title="T4", description="D4", estimated_spend_inr=0)

    with pytest.raises(ValidationError):
        ItineraryDay(
            day=1,
            date="2026-10-10",
            title="Day 1",
            slots=[s1, s2, s3, s4], # 10:00 before 08:00
            estimated_spend_today_inr=350
        )
