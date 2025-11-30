from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import schemas
from app.db.database import get_db
from app.services import ai_service 

router = APIRouter()

@router.get("/insights", response_model=List[schemas.CategoriaInsight])
def get_stored_insights(db: Session = Depends(get_db)):
    """
    Retorna o último relatório gravado. Se não existir, gera um.
    """
    # 1. Tenta ler da BD
    relatorio = ai_service.get_latest_report(db)
    
    if relatorio:
        return relatorio
    
    # 2. Se a BD estiver vazia, gera o primeiro
    return ai_service.generate_and_save_insights(db)

@router.post("/insights/refresh", response_model=List[schemas.CategoriaInsight])
def refresh_insights(db: Session = Depends(get_db)):
    """
    Força a geração de um novo relatório (botão 'Gerar Nova Análise').
    """
    return ai_service.generate_and_save_insights(db)