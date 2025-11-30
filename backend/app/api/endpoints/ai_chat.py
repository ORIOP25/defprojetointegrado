from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import schemas
from app.db.database import get_db
from app.services import ai_service

router = APIRouter()

@router.post("/message", response_model=schemas.ChatResponse)
def chat_endpoint(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    """
    Endpoint para conversar com a IA sobre os dados da escola.
    """
    resposta_texto = ai_service.chat_with_data(db, request.message)
    
    return {"response": resposta_texto}