from typing import List, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from pydantic import BaseModel

router = APIRouter()

class DisciplinaOut(BaseModel):
    Disc_id: int
    Nome: str
    Categoria: str # Importante para filtrar o departamento do professor

    class Config:
        from_attributes = True

@router.get("/", response_model=List[DisciplinaOut])
def read_disciplinas(db: Session = Depends(get_db)):
    """Lista todas as disciplinas disponíveis para associar a turmas."""
    return db.query(models.Disciplina).all()