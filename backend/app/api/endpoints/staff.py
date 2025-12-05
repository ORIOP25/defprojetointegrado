from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db, Base
from app.db import models, schemas
from app.db.models import Staff     # importa o model Staff

router = APIRouter()

@router.get("/", response_model=List[schemas.StaffDisplay])
def read_staff(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Obtém lista de staff.
    """
    try:
        staff_query = db.query(Staff).offset(skip).limit(limit).all()
        results = []
        for s in staff_query:
            print(f"Lendo staff: {s.Staff_id} | {s.Nome} | {s.email}")  # debug
            results.append({
                "id": s.Staff_id,
                "email": s.email,
                "Nome": s.Nome,
                "Cargo": s.Cargo,
                "role": s.role
            })
        return results
    except Exception as e:
        print("Erro ao ler staff:", e)
        raise HTTPException(status_code=500, detail="Erro ao ler staff")

@router.delete("/staff/{staff_id}", status_code=204)
def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    staff_member = db.query(models.Staff).filter(models.Staff.Staff_id == staff_id).first()
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff não encontrado")
    db.delete(staff_member)
    db.commit()
    return
