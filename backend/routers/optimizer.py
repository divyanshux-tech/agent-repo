from fastapi import APIRouter, HTTPException
from models.optimizer_schemas import OptimizerRequest, OptimizerPlanResponse
from agents.optimizer import optimize_trip
from typing import List

router = APIRouter()

@router.post("/run", response_model=List[OptimizerPlanResponse])
async def run_optimizer(req: OptimizerRequest):
    try:
        plans = optimize_trip(req)
        return plans
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
