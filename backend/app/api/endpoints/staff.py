from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models, schemas

router = APIRouter()

@router.post("/", response_model=schemas.StaffListagem)
def create_staff(staff: schemas.StaffCreate, db: Session = Depends(get_db)):
    # Verificar se email já existe
    db_user = db.query(models.Staff).filter(models.Staff.Email == staff.Email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já registado")

    # Criar novo Staff com os novos campos
    new_staff = models.Staff(
        Nome=staff.Nome,
        Email=staff.Email,
        Telefone=staff.Telefone,
        Morada=staff.Morada,
        Cargo=staff.Cargo,
        Departamento=staff.Departamento,
        Role=staff.Role,
        Salario=staff.Salario,  
        Escalao=staff.Escalao   
    )
    
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return new_staff

@router.put("/{staff_id}", response_model=schemas.StaffListagem)
def update_staff(staff_id: int, staff_data: schemas.StaffUpdate, db: Session = Depends(get_db)):
    staff = db.query(models.Staff).filter(models.Staff.Staff_id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff não encontrado")

    # Atualiza apenas os campos enviados
    if staff_data.Nome: staff.Nome = staff_data.Nome
    if staff_data.Email: staff.Email = staff_data.Email
    if staff_data.Telefone: staff.Telefone = staff_data.Telefone
    if staff_data.Morada: staff.Morada = staff_data.Morada
    if staff_data.Cargo: staff.Cargo = staff_data.Cargo
    if staff_data.Departamento: staff.Departamento = staff_data.Departamento
    if staff_data.Role: staff.Role = staff_data.Role
    
    # --- NOVOS CAMPOS ---
    if staff_data.Salario is not None: staff.Salario = staff_data.Salario
    if staff_data.Escalao is not None: staff.Escalao = staff_data.Escalao

    db.commit()
    db.refresh(staff)
    return staff

@router.get("/", response_model=List[schemas.StaffDisplay])
def read_staff(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Obtém lista unificada de Staff e Professores.
    """
    try:
        # 1. Buscar Staff
        staff_query = db.query(models.Staff).all()
        
        # 2. Buscar Professores
        prof_query = db.query(models.Professor).all()

        results = []

        # Processar Staff
        for s in staff_query:
            results.append({
                "id": s.Staff_id,
                "email": s.email,
                "Nome": s.Nome,
                "Cargo": s.Cargo,
                # Se o campo role não existir na BD, assumimos "staff"
                "role": getattr(s, "role", "staff") 
            })

        # Processar Professores
        for p in prof_query:
            results.append({
                "id": p.Professor_id,
                "email": p.email,
                "Nome": p.Nome,
                "Cargo": "Docente", # Professores não costumam ter campo Cargo, definimos fixo
                "role": "teacher"   # Forçamos o role para o frontend saber que é professor
            })

        # Ordenar por nome
        results.sort(key=lambda x: x["Nome"])

        # Paginação manual (porque juntámos duas listas)
        return results[skip : skip + limit]

    except Exception as e:
        print("Erro ao ler lista unificada:", e)
        raise HTTPException(status_code=500, detail="Erro ao ler lista de equipa")

@router.delete("/{id}", status_code=204)
def delete_staff_member(id: int, role: Optional[str] = "staff", db: Session = Depends(get_db)):
    """
    Elimina um membro da equipa. Requer o 'role' (query param) para saber em que tabela apagar.
    Ex: DELETE /staff/5?role=teacher
    """
    if role == "teacher":
        member = db.query(models.Professor).filter(models.Professor.Professor_id == id).first()
    else:
        member = db.query(models.Staff).filter(models.Staff.Staff_id == id).first()

    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    db.delete(member)
    db.commit()
    return