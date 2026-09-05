from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, trips, bookings, voice, destination_agent, travel, hotels, activity, expense, optimizer, itinerary, companion
# from services.rag_service import load_embeddings_at_startup

app = FastAPI(title="Plan Through Us API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-vercel-app.vercel.app", "http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # load_embeddings_at_startup()  # loads knowledge_chunks.json into memory
    pass

@app.get("/health")
async def health():
    return {"status": "ok"}  # Render cold-start ping endpoint

app.include_router(chat.router,     prefix="/chat")
app.include_router(trips.router,    prefix="/trips")
app.include_router(bookings.router, prefix="/bookings")
app.include_router(voice.router,    prefix="/api/voice")
app.include_router(companion.router, prefix="/api/trips", tags=["Companion"])
app.include_router(destination_agent.router, prefix="/api/destination-agent")
app.include_router(travel.router, prefix="/api/v1/travel")
app.include_router(hotels.router, prefix="/api/v1/hotels")
app.include_router(activity.router, prefix="/api/v1/activities")
app.include_router(expense.router, prefix="/api/v1/expenses")
app.include_router(optimizer.router, prefix="/api/v1/optimizer")
app.include_router(itinerary.router)