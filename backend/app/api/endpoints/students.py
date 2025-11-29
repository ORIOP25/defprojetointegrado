from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db import models
from app.db import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.AlunoListagem])
def read_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Obtém lista de alunos com paginação.
    Faz JOIN com Turma e EncarregadoEducacao para mostrar nomes reais.
    """
    alunos_query = db.query(models.Aluno)\
        .options(joinedload(models.Aluno.turma_obj))\
        .options(joinedload(models.Aluno.encarregado_educacao))\
        .offset(skip)\
        .limit(limit)\
        .all()

    results = []
    for aluno in alunos_query:
        turma_str = "Sem Turma"
        if aluno.turma_obj:
            turma_str = f"{aluno.turma_obj.Ano}º {aluno.turma_obj.Turma}"

        ee_str = "N/A"
        if aluno.encarregado_educacao:
            ee_str = aluno.encarregado_educacao.Nome

        results.append({
            "Aluno_id": aluno.Aluno_id,
            "Nome": aluno.Nome,
            "Data_Nasc": aluno.Data_Nasc,
            "Genero": aluno.Genero,
            "Turma_Desc": turma_str,
            "EE_Nome": ee_str,
            "Telefone": aluno.Telefone
        })
    
    return results