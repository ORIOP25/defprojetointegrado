from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import schemas
from app.db.database import get_db
# Importamos o serviço que acabámos de criar
from app.services import ai_service 

router = APIRouter()

@router.get("/insights", response_model=List[schemas.CategoriaInsight])
def get_ai_recommendations(db: Session = Depends(get_db)):
    """
    Gera insights hierárquicos: Categoria -> Cards -> Tabela de Detalhes.
    """
    insights = ai_service.generate_insights(db)
    return insights