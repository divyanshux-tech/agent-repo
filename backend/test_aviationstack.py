import asyncio
from datetime import datetime
from services.aviationstack import search_flights

async def test():
    print("Searching flights...")
    try:
        flights = await search_flights(from_iata="DEL", to_iata="GOI", date=datetime.now())
        print(flights)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test())
