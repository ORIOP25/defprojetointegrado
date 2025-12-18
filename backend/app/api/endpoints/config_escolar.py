from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db import models, schemas

router = APIRouter()

# --- DEPARTAMENTOS ---
@router.get("/departamentos/", response_model=List[schemas.DepartamentoDisplay])
def listar_departamentos(db: Session = Depends(get_db)):
    return db.query(models.Departamento).all()

@router.post("/departamentos/", response_model=schemas.DepartamentoDisplay)
def criar_departamento(dep: schemas.DepartamentoCreate, db: Session = Depends(get_db)):
    novo_dep = models.Departamento(Nome=dep.Nome)
    db.add(novo_dep); db.commit(); db.refresh(novo_dep)
    return novo_dep

@router.put("/departamentos/{dep_id}", response_model=schemas.DepartamentoDisplay)
def editar_departamento(dep_id: int, dep: schemas.DepartamentoCreate, db: Session = Depends(get_db)):
    db_dep = db.query(models.Departamento).filter(models.Departamento.Depart_id == dep_id).first()
    if not db_dep: raise HTTPException(404)
    db_dep.Nome = dep.Nome
    db.commit(); db.refresh(db_dep); return db_dep

@router.delete("/departamentos/{dep_id}")
def eliminar_departamento(dep_id: int, db: Session = Depends(get_db)):
    dep = db.query(models.Departamento).filter(models.Departamento.Depart_id == dep_id).first()
    if not dep: raise HTTPException(404)
    db.delete(dep); db.commit(); return {"message": "OK"}

# --- ESCALÕES ---
@router.get("/escaloes/", response_model=List[schemas.EscalaoDisplay])
def listar_escaloes(db: Session = Depends(get_db)):
    return db.query(models.Escalao).all()

@router.post("/escaloes/", response_model=schemas.EscalaoDisplay)
def criar_escalao(esc: schemas.EscalaoCreate, db: Session = Depends(get_db)):
    novo = models.Escalao(Nome=esc.Nome, Valor_Base=esc.Valor_Base, Descricao=esc.Descricao)
    db.add(novo); db.commit(); db.refresh(novo); return novo

@router.put("/escaloes/{esc_id}", response_model=schemas.EscalaoDisplay)
def editar_escalao(esc_id: int, esc: schemas.EscalaoCreate, db: Session = Depends(get_db)):
    db_esc = db.query(models.Escalao).filter(models.Escalao.Escalao_id == esc_id).first()
    if not db_esc: raise HTTPException(404)
    db_esc.Nome, db_esc.Valor_Base, db_esc.Descricao = esc.Nome, esc.Valor_Base, esc.Descricao
    db.commit(); return db_esc

@router.delete("/escaloes/{esc_id}")
def eliminar_escalao(esc_id: int, db: Session = Depends(get_db)):
    esc = db.query(models.Escalao).filter(models.Escalao.Escalao_id == esc_id).first()
    if not esc: raise HTTPException(404)
    db.delete(esc); db.commit(); return {"message": "OK"}

# --- DISCIPLINAS ---
@router.get("/disciplinas/", response_model=List[schemas.DisciplinaDisplay])
def listar_disciplinas(db: Session = Depends(get_db)):
    return db.query(models.Disciplina).all()

@router.post("/disciplinas/", response_model=schemas.DisciplinaDisplay)
def criar_disciplina(disc: schemas.DisciplinaCreate, db: Session = Depends(get_db)):
    nova = models.Disciplina(Nome=disc.Nome, Categoria=disc.Categoria)
    db.add(nova); db.commit(); db.refresh(nova); return nova

@router.put("/disciplinas/{disc_id}", response_model=schemas.DisciplinaDisplay)
def editar_disciplina(disc_id: int, disc: schemas.DisciplinaCreate, db: Session = Depends(get_db)):
    db_disc = db.query(models.Disciplina).filter(models.Disciplina.Disc_id == disc_id).first()
    if not db_disc: raise HTTPException(404)
    db_disc.Nome, db_disc.Categoria = disc.Nome, disc.Categoria
    db.commit(); return db_disc

@router.delete("/disciplinas/{disc_id}")
def eliminar_disciplina(disc_id: int, db: Session = Depends(get_db)):
    disc = db.query(models.Disciplina).filter(models.Disciplina.Disc_id == disc_id).first()
    if not disc: raise HTTPException(404)
    db.delete(disc); db.commit(); return {"message": "OK"}