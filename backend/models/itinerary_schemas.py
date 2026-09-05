from pydantic import BaseModel, Field, model_validator, field_validator
from typing import Literal, List, Optional
from datetime import date, datetime, timedelta

SlotType = Literal[
    "travel",
    "checkin",
    "checkout",
    "activity",
    "explore",
    "food",
    "rest",
    "shopping",
    "logistics",
    "nightlife",
    "spiritual",
    "nature",
    "photography"
]

class ItinerarySlot(BaseModel):
    time: str = Field(..., description="24-hour HH:MM")
    end_time: Optional[str] = Field(None, description="optional HH:MM")
    type: SlotType
    title: str = Field(..., min_length=1, max_length=120)
    description: str = Field(..., min_length=1, max_length=500)
    location: Optional[str] = Field(None, max_length=200)
    estimated_spend_inr: int = Field(..., ge=0, le=50000)
    activity_id: Optional[str] = Field(None, pattern=r"^A\d+$")
    inferred: bool = False
    flags: List[str] = Field(default_factory=list)

    @model_validator(mode='after')
    def validate_times(self) -> 'ItinerarySlot':
        if self.end_time:
            # simple string comparison works for HH:MM format
            if self.time >= self.end_time:
                raise ValueError(f"end_time {self.end_time} must be after time {self.time}")
        return self

class ItineraryDay(BaseModel):
    day: int = Field(..., ge=1, le=60)
    date: date
    title: str = Field(..., min_length=1, max_length=100)
    slots: List[ItinerarySlot] = Field(..., min_length=4)
    estimated_spend_today_inr: int = Field(..., ge=0)
    notes: Optional[str] = Field(None, max_length=500)

    @model_validator(mode='after')
    def validate_day(self) -> 'ItineraryDay':
        # 1. Validate sum of slots
        actual_spend = sum(slot.estimated_spend_inr for slot in self.slots)
        if self.estimated_spend_today_inr != actual_spend:
            raise ValueError(f"estimated_spend_today_inr ({self.estimated_spend_today_inr}) does not equal sum of slot spends ({actual_spend})")

        # 2. Validate time ordering
        slot_order_priority = {
            "travel": 0,
            "checkin": 1,
            "checkout": 2,
            "logistics": 3,
            "activity": 4,
            "food": 5,
            "spiritual": 6,
            "photography": 7,
            "explore": 8,
            "shopping": 9,
            "nature": 10,
            "nightlife": 11,
            "rest": 12
        }

        for i in range(len(self.slots) - 1):
            s1 = self.slots[i]
            s2 = self.slots[i + 1]
            if s1.time > s2.time:
                raise ValueError(f"Slots are not in non-decreasing time order: {s1.time} > {s2.time}")
            elif s1.time == s2.time:
                # Use priority fallback
                p1 = slot_order_priority.get(s1.type, 99)
                p2 = slot_order_priority.get(s2.type, 99)
                if p1 > p2:
                    raise ValueError(f"Slots at same time {s1.time} not in correct priority order ({s1.type} vs {s2.type})")
        return self

class Itinerary(BaseModel):
    trip_id: str
    destination: str
    language: str
    days: List[ItineraryDay] = Field(..., min_length=1)
    total_estimated_spend_inr: int
    warnings: List[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    @model_validator(mode='after')
    def validate_itinerary(self) -> 'Itinerary':
        actual_total = sum(d.estimated_spend_today_inr for d in self.days)
        if self.total_estimated_spend_inr != actual_total:
            raise ValueError(f"total_estimated_spend_inr ({self.total_estimated_spend_inr}) != sum of daily spends ({actual_total})")
            
        if self.days:
            start_date = self.days[0].date
            for idx, d in enumerate(self.days):
                if d.day != idx + 1:
                    raise ValueError(f"Day number sequence error: expected {idx + 1}, got {d.day}")
                expected_date = start_date + timedelta(days=idx)
                if d.date != expected_date:
                    raise ValueError(f"Date sequence error on day {d.day}: expected {expected_date}, got {d.date}")
                    
        return self
