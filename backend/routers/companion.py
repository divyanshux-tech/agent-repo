import os
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from services.companion_service import (
    generate_packing_checklist,
    update_packing_item,
    upload_document,
    get_documents,
    get_flight_status,
    CompanionServiceError
)

router = APIRouter()

# Mock auth
async def get_current_user():
    return "user_123"

class ChecklistItemUpdate(BaseModel):
    checked: bool

@router.get("/{trip_id}/checklist")
async def get_checklist(trip_id: str, user_id: str = Depends(get_current_user)):
    try:
        checklist = await generate_packing_checklist(trip_id)
        return checklist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{trip_id}/checklist/items/{item_id}")
async def update_item(trip_id: str, item_id: str, update: ChecklistItemUpdate, user_id: str = Depends(get_current_user)):
    try:
        checklist = await update_packing_item(trip_id, item_id, update.checked)
        return checklist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trip_id}/documents")
async def list_documents(trip_id: str, user_id: str = Depends(get_current_user)):
    try:
        docs = await get_documents(trip_id, user_id)
        return docs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{trip_id}/documents")
async def upload_doc(trip_id: str, document_type: str = Form(...), file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    try:
        # Save temp file
        temp_path = f"/tmp/{file.filename}"
        os.makedirs("/tmp", exist_ok=True)
        with open(temp_path, "wb") as f:
            f.write(await file.read())
            
        doc = await upload_document(
            trip_id=trip_id,
            user_id=user_id,
            file_path=temp_path,
            original_name=file.filename,
            mime_type=file.content_type or "application/octet-stream",
            doc_type=document_type
        )
        
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trip_id}/flights/status")
async def flight_status(trip_id: str, user_id: str = Depends(get_current_user)):
    try:
        status = await get_flight_status(trip_id)
        if not status:
            raise HTTPException(status_code=404, detail="No active flight found for this trip")
        return status
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
