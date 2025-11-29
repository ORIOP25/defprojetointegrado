from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models, schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.StaffDisplay])
def read_staff(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Obtém lista de staff.
    """
    staff_query = db.query(models.Staff).offset(skip).limit(limit).all()
    
    # Mapeamento manual para garantir que os nomes dos campos batem certo
    results = []
    for s in staff_query:
        results.append({
            "id": s.Staff_id,    # O model tem Staff_id, o schema quer id
            "email": s.email,
            "Nome": s.Nome,
            "Cargo": s.Cargo,
            "role": s.role
        })

    return results