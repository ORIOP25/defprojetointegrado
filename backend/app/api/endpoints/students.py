from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db import models
from app.db import schemas

router = APIRouter()

# --- 1. LISTAR ALUNOS ---
@router.get("/", response_model=List[schemas.AlunoListagem])
def read_students(skip: int = 0, limit: int = 100, search: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Aluno)\
        .options(joinedload(models.Aluno.turma_obj))\
        .options(joinedload(models.Aluno.encarregado_educacao))

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(models.Aluno.Nome.ilike(search_fmt))

    alunos_query = query.offset(skip).limit(limit).all()

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

# Em backend/app/api/endpoints/students.py

@router.put("/{aluno_id}", response_model=schemas.AlunoListagem)
def update_student(aluno_id: int, aluno_update: schemas.AlunoUpdate, db: Session = Depends(get_db)):
    """Atualiza os dados pessoais do aluno e do seu Encarregado de Educação."""
    
    # 1. Buscar o Aluno
    db_aluno = db.query(models.Aluno).filter(models.Aluno.Aluno_id == aluno_id).first()
    if not db_aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # 2. Atualizar dados diretos do Aluno
    if aluno_update.Nome:
        db_aluno.Nome = aluno_update.Nome
    if aluno_update.Telefone:
        db_aluno.Telefone = aluno_update.Telefone
    if aluno_update.Data_Nasc:
        db_aluno.Data_Nasc = aluno_update.Data_Nasc
    if aluno_update.Genero:
        db_aluno.Genero = aluno_update.Genero

    # 3. Atualizar o Encarregado de Educação (Lógica Nova)
    if aluno_update.EE_Nome:
        # Se o aluno já tem EE, atualizamos o nome dele
        if db_aluno.encarregado_educacao:
            db_aluno.encarregado_educacao.Nome = aluno_update.EE_Nome
        else:
            # (Opcional) Se não tiver EE, podes ignorar ou criar lógica para criar um novo.
            # Por agora, assumimos que só editamos se ele existir.
            pass

    db.commit()
    db.refresh(db_aluno)

    # 4. Preparar resposta formatada
    turma_str = "Sem Turma"
    if db_aluno.turma_obj:
        turma_str = f"{db_aluno.turma_obj.Ano}º {db_aluno.turma_obj.Turma}"

    ee_str = "N/A"
    if db_aluno.encarregado_educacao:
        ee_str = db_aluno.encarregado_educacao.Nome

    return {
        "Aluno_id": db_aluno.Aluno_id,
        "Nome": db_aluno.Nome,
        "Data_Nasc": db_aluno.Data_Nasc,
        "Genero": db_aluno.Genero,
        "Turma_Desc": turma_str,
        "EE_Nome": ee_str,
        "Telefone": db_aluno.Telefone
    }

# --- 2. LISTAR DISCIPLINAS (PARA O DROPDOWN) ---
@router.get("/disciplinas/list", response_model=List[schemas.DisciplinaSimple])
def get_all_disciplines(db: Session = Depends(get_db)):
    """Retorna todas as disciplinas para preencher o select no frontend."""
    return db.query(models.Disciplina).all()

# --- 3. ATUALIZAR NOTA (EDITAR) ---
@router.put("/grades/{nota_id}", response_model=schemas.NotaDisplay)
def update_student_grade(nota_id: int, grade_update: schemas.NotaUpdate, db: Session = Depends(get_db)):
    """Atualiza as notas de um registo existente."""
    db_nota = db.query(models.Nota).filter(models.Nota.Nota_id == nota_id).first()
    if not db_nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    # Atualiza apenas os campos enviados
    update_data = grade_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_nota, key, value)
    
    db.commit()
    db.refresh(db_nota)
    
    # Pequeno hack para garantir que o nome da disciplina vai na resposta
    disciplina = db.query(models.Disciplina).filter(models.Disciplina.Disc_id == db_nota.Disc_id).first()
    
    return {
        **db_nota.__dict__,
        "Disciplina_Nome": disciplina.Nome if disciplina else "Desconhecida"
    }

# --- 4. LER NOTAS DO ALUNO ---
@router.get("/{aluno_id}/grades", response_model=List[schemas.NotaDisplay])
def read_student_grades(aluno_id: int, db: Session = Depends(get_db)):
    notas = db.query(models.Nota)\
        .options(joinedload(models.Nota.disciplina))\
        .filter(models.Nota.Aluno_id == aluno_id)\
        .all()
    
    results = []
    for nota in notas:
        results.append({
            "Nota_id": nota.Nota_id,
            "Disc_id": nota.Disc_id,
            "Disciplina_Nome": nota.disciplina.Nome if nota.disciplina else f"ID {nota.Disc_id}",
            "Nota_1P": nota.Nota_1P,
            "Nota_2P": nota.Nota_2P,
            "Nota_3P": nota.Nota_3P,
            "Nota_Ex": nota.Nota_Ex,
            "Nota_Final": nota.Nota_Final,
            "Ano_letivo": nota.Ano_letivo
        })
    return results

# --- 5. CRIAR NOVA NOTA ---
@router.post("/{aluno_id}/grades", response_model=schemas.NotaDisplay)
def create_student_grade(aluno_id: int, nota: schemas.NotaCreate, db: Session = Depends(get_db)):
    disciplina = db.query(models.Disciplina).filter(models.Disciplina.Disc_id == nota.Disc_id).first()
    if not disciplina:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    nova_nota = models.Nota(
        Aluno_id=aluno_id,
        Disc_id=nota.Disc_id,
        Nota_1P=nota.Nota_1P,
        Nota_2P=nota.Nota_2P,
        Nota_3P=nota.Nota_3P,
        Nota_Ex=nota.Nota_Ex,
        Nota_Final=nota.Nota_Final,
        Ano_letivo=nota.Ano_letivo
    )
    
    db.add(nova_nota)
    db.commit()
    db.refresh(nova_nota)

    return {
        **nova_nota.__dict__,
        "Disciplina_Nome": disciplina.Nome
    }

# --- Eliminar Nota---

@router.delete("/grades/{nota_id}")
def delete_student_grade(nota_id: int, db: Session = Depends(get_db)):
    """Elimina uma nota específica."""
    nota = db.query(models.Nota).filter(models.Nota.Nota_id == nota_id).first()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    db.delete(nota)
    db.commit()
    return {"message": "Nota eliminada com sucesso"}