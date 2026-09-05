from fastapi import APIRouter, HTTPException
from models.expense_schemas import ExpenseEstimateRequest, ExpenseEstimateResponse
from agents.expense import estimate_trip_expenses

router = APIRouter()

@router.post("/estimate", response_model=ExpenseEstimateResponse)
async def get_expense_estimate(req: ExpenseEstimateRequest):
    try:
        # Agent handles idempotency and persistence
        result = estimate_trip_expenses(req)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
