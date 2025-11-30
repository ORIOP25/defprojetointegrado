from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import schemas
from app.db.database import get_db
# Importamos o serviço que acabámos de criar
from app.services import ai_service 

router = APIRouter()

@router.get("/insights", response_model=List[schemas.RecomendacaoIA])
def get_ai_recommendations(db: Session = Depends(get_db)):
    """
    Endpoint que conecta ao Gemini via 'ai_service' para gerar insights reais.
    """
    # A magia acontece aqui:
    insights = ai_service.generate_insights(db)
    
    return insights