from fastapi import APIRouter

router = APIRouter()

@router.get("")
async def get_trips(user_id: str):
    # Mock return
    return {"trips": []}

@router.post("")
async def create_trip(user_id: str):
    # Mock return
    return {"id": "mock-trip-id", "status": "planning"}