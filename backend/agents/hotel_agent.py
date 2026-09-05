import asyncio
from models.candidate import HotelCandidate

async def search_hotels(destination: str, checkin: str, checkout: str, guests: int, nights: int = 4):
    # Mock data for hotels
    dest_name = destination or "Goa"
    return [
        HotelCandidate(
            id="H1",
            name=f"Budget Stay {dest_name}",
            lat=15.01,
            lon=74.02,
            category="guesthouse",
            rating=3.8,
            price_total_inr=1500 * nights,
            nights=nights,
            price_band="budget",
            cancellation="Free cancellation until 2 days before",
            source_reference="MOCK_OTM_1"
        ),
        HotelCandidate(
            id="H2",
            name=f"{dest_name} Beach Resort",
            lat=15.02,
            lon=74.03,
            category="hotel",
            rating=4.2,
            price_total_inr=4000 * nights,
            nights=nights,
            price_band="standard",
            cancellation="Free cancellation until 5 days before",
            source_reference="MOCK_OTM_2"
        ),
        HotelCandidate(
            id="H3",
            name=f"Taj Exotica {dest_name}",
            lat=15.05,
            lon=74.05,
            category="resort",
            rating=4.8,
            price_total_inr=12000 * nights,
            nights=nights,
            price_band="premium",
            cancellation="Non-refundable",
            source_reference="MOCK_OTM_3"
        )
    ]