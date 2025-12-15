from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db import models
from app.db import schemas
import pandas as pd
import io

router = APIRouter()

# --- 1. LISTAR ALUNOS (Com Filtros, Paginação e Ordenação) ---
@router.get("/", response_model=List[schemas.AlunoListagem])
def read_students(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None, 
    turma_id: Optional[int] = None, 
    sort_by: Optional[str] = "id",
    db: Session = Depends(get_db)
):
    query = db.query(models.Aluno)\
        .options(joinedload(models.Aluno.turma_obj))\
        .options(joinedload(models.Aluno.encarregado_educacao))

    # Filtros
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(models.Aluno.Nome.ilike(search_fmt))
    
    if turma_id:
        query = query.filter(models.Aluno.Turma_id == turma_id)

    # Ordenação
    if sort_by == "name":
        query = query.order_by(models.Aluno.Nome)
    else:
        query = query.order_by(models.Aluno.Aluno_id)

    alunos_query = query.offset(skip).limit(limit).all()

    results = []
    for aluno in alunos_query:
        turma_str = "Sem Turma"
        t_ano = 0
        t_letra = ""
        if aluno.turma_obj:
            turma_str = f"{aluno.turma_obj.Ano}º {aluno.turma_obj.Turma}"
            t_ano = aluno.turma_obj.Ano
            t_letra = aluno.turma_obj.Turma

        ee_nome = "N/A"
        ee_tel = None
        ee_email = None
        ee_morada = None
        ee_relacao = None
        
        if aluno.encarregado_educacao:
            ee = aluno.encarregado_educacao
            ee_nome = ee.Nome
            ee_tel = ee.Telefone
            ee_email = ee.Email
            ee_morada = ee.Morada
            ee_relacao = ee.Relacao

        results.append({
            "Aluno_id": aluno.Aluno_id,
            "Nome": aluno.Nome,
            "Data_Nasc": aluno.Data_Nasc,
            "Genero": aluno.Genero,
            "Telefone": aluno.Telefone,
            "Turma_Desc": turma_str,
            "Turma_Ano": t_ano,
            "Turma_Letra": t_letra,
            "EE_Nome": ee_nome,
            "EE_Telefone": ee_tel,
            "EE_Email": ee_email,
            "EE_Morada": ee_morada,
            "EE_Relacao": ee_relacao
        })
    
    return results

# --- 2. LISTAR DISCIPLINAS E TURMAS ---
@router.get("/disciplinas/list", response_model=List[schemas.DisciplinaSimple])
def get_all_disciplines(db: Session = Depends(get_db)):
    return db.query(models.Disciplina).all()

@router.get("/turmas/list", response_model=List[schemas.TurmaSimple])
def get_all_turmas(db: Session = Depends(get_db)):
    return db.query(models.Turma).order_by(models.Turma.Ano, models.Turma.Turma).all()

# --- 3. CRUD ALUNOS (CRIAR / EDITAR) ---
@router.post("/", response_model=schemas.AlunoListagem)
def create_student_full(aluno_in: schemas.AlunoCreateFull, db: Session = Depends(get_db)):
    # 1. Criar EE
    novo_ee = models.EncarregadoEducacao(
        Nome=aluno_in.EE_Nome,
        Telefone=aluno_in.EE_Telefone,
        Email=aluno_in.EE_Email,
        Morada=aluno_in.EE_Morada,
        Relacao=aluno_in.EE_Relacao
    )
    db.add(novo_ee)
    db.flush()

    # 2. Procurar Turma
    turma = db.query(models.Turma).filter(
        models.Turma.Ano == aluno_in.Ano,
        models.Turma.Turma == aluno_in.Turma_Letra
    ).first()
    
    turma_id = turma.Turma_id if turma else None

    # 3. Criar Aluno
    novo_aluno = models.Aluno(
        Nome=aluno_in.Nome,
        Data_Nasc=aluno_in.Data_Nasc,
        Genero=aluno_in.Genero,
        Telefone=aluno_in.Telefone,
        Ano=aluno_in.Ano,
        Turma_id=turma_id,
        EE_id=novo_ee.EE_id
    )
    db.add(novo_aluno)
    db.commit()
    db.refresh(novo_aluno)

    return {
        "Aluno_id": novo_aluno.Aluno_id,
        "Nome": novo_aluno.Nome,
        "Data_Nasc": novo_aluno.Data_Nasc,
        "Genero": novo_aluno.Genero,
        "Turma_Desc": f"{turma.Ano}º {turma.Turma}" if turma else "Sem Turma",
        "Turma_Ano": turma.Ano if turma else 0,
        "Turma_Letra": turma.Turma if turma else "",
        "EE_Nome": novo_ee.Nome,
        "EE_Telefone": novo_ee.Telefone,
        "Telefone": novo_aluno.Telefone
    }

@router.put("/{aluno_id}", response_model=schemas.AlunoListagem)
def update_student(aluno_id: int, dados: schemas.AlunoUpdate, db: Session = Depends(get_db)):
    db_aluno = db.query(models.Aluno).filter(models.Aluno.Aluno_id == aluno_id).first()
    if not db_aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    if dados.Nome: db_aluno.Nome = dados.Nome
    if dados.Telefone: db_aluno.Telefone = dados.Telefone
    if dados.Data_Nasc: db_aluno.Data_Nasc = dados.Data_Nasc
    if dados.Genero: db_aluno.Genero = dados.Genero

    if dados.Ano is not None and dados.Turma_Letra is not None:
        nova_turma = db.query(models.Turma).filter(
            models.Turma.Ano == dados.Ano,
            models.Turma.Turma == dados.Turma_Letra
        ).first()
        if nova_turma:
            db_aluno.Turma_id = nova_turma.Turma_id
            db_aluno.Ano = dados.Ano

    if db_aluno.encarregado_educacao:
        ee = db_aluno.encarregado_educacao
        if dados.EE_Nome: ee.Nome = dados.EE_Nome
        if dados.EE_Telefone: ee.Telefone = dados.EE_Telefone
        if dados.EE_Email: ee.Email = dados.EE_Email
        if dados.EE_Morada: ee.Morada = dados.EE_Morada
        if dados.EE_Relacao: ee.Relacao = dados.EE_Relacao

    db.commit()
    db.refresh(db_aluno)
    
    turma = db_aluno.turma_obj
    ee = db_aluno.encarregado_educacao
    
    return {
        "Aluno_id": db_aluno.Aluno_id,
        "Nome": db_aluno.Nome,
        "Data_Nasc": db_aluno.Data_Nasc,
        "Genero": db_aluno.Genero,
        "Telefone": db_aluno.Telefone,
        "Turma_Desc": f"{turma.Ano}º {turma.Turma}" if turma else "Sem Turma",
        "Turma_Ano": turma.Ano if turma else 0,
        "Turma_Letra": turma.Turma if turma else "",
        "EE_Nome": ee.Nome if ee else "N/A",
        "EE_Telefone": ee.Telefone if ee else None,
        "EE_Email": ee.Email if ee else None,
        "EE_Morada": ee.Morada if ee else None,
        "EE_Relacao": ee.Relacao if ee else None
    }

@router.delete("/{aluno_id}")
def delete_student(aluno_id: int, db: Session = Depends(get_db)):
    aluno = db.query(models.Aluno).filter(models.Aluno.Aluno_id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    # Nota: Isto pode falhar se o aluno tiver notas/faltas associadas (Integridade Referencial)
    # O ideal seria apagar as dependências primeiro ou usar CASCADE na base de dados
    db.delete(aluno)
    db.commit()
    return {"message": "Aluno eliminado"}

# --- 4. GESTÃO DE NOTAS ---
@router.put("/grades/{nota_id}", response_model=schemas.NotaDisplay)
def update_student_grade(nota_id: int, grade_update: schemas.NotaUpdate, db: Session = Depends(get_db)):
    db_nota = db.query(models.Nota).filter(models.Nota.Nota_id == nota_id).first()
    if not db_nota: raise HTTPException(status_code=404, detail="Nota não encontrada")
    update_data = grade_update.dict(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_nota, key, value)
    db.commit()
    db.refresh(db_nota)
    disciplina = db.query(models.Disciplina).filter(models.Disciplina.Disc_id == db_nota.Disc_id).first()
    return {**db_nota.__dict__, "Disciplina_Nome": disciplina.Nome if disciplina else "Desconhecida"}

@router.get("/{aluno_id}/grades", response_model=List[schemas.NotaDisplay])
def read_student_grades(aluno_id: int, db: Session = Depends(get_db)):
    notas = db.query(models.Nota).options(joinedload(models.Nota.disciplina)).filter(models.Nota.Aluno_id == aluno_id).all()
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

@router.post("/{aluno_id}/grades", response_model=schemas.NotaDisplay)
def create_student_grade(aluno_id: int, nota: schemas.NotaCreate, db: Session = Depends(get_db)):
    disciplina = db.query(models.Disciplina).filter(models.Disciplina.Disc_id == nota.Disc_id).first()
    if not disciplina: raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    nova_nota = models.Nota(Aluno_id=aluno_id, Disc_id=nota.Disc_id, Nota_1P=nota.Nota_1P, Nota_2P=nota.Nota_2P, Nota_3P=nota.Nota_3P, Nota_Ex=nota.Nota_Ex, Nota_Final=nota.Nota_Final, Ano_letivo=nota.Ano_letivo)
    db.add(nova_nota)
    db.commit()
    db.refresh(nova_nota)
    return {**nova_nota.__dict__, "Disciplina_Nome": disciplina.Nome}

@router.delete("/grades/{nota_id}")
def delete_student_grade(nota_id: int, db: Session = Depends(get_db)):
    nota = db.query(models.Nota).filter(models.Nota.Nota_id == nota_id).first()
    if not nota: raise HTTPException(status_code=404, detail="Nota não encontrada")
    db.delete(nota)
    db.commit()
    return {"message": "Nota eliminada"}

# --- 5. IMPORT / EXPORT (CORRIGIDO) ---

@router.get("/data/template")
def get_student_template():
    """Retorna um template com uma linha de exemplo e limites explicativos."""
    # Cabeçalhos
    columns = [
        "Nome", "Data_Nasc (AAAA-MM-DD)", "Genero (M/F)", "Telefone", 
        "Ano", "Turma (Letra)", 
        "EE_Nome", "EE_Telefone", "EE_Email", "EE_Morada", "EE_Relacao"
    ]
    
    # Dados de Exemplo (para ajudar o utilizador)
    example_data = [{
        "Nome": "Ex: João Silva",
        "Data_Nasc (AAAA-MM-DD)": "2008-05-20",
        "Genero (M/F)": "M",
        "Telefone": "912345678",
        "Ano": "5-12",
        "Turma (Letra)": "A-E",
        "EE_Nome": "Nome do Pai/Mãe",
        "EE_Telefone": "919999999",
        "EE_Email": "email@exemplo.com",
        "EE_Morada": "Rua da Escola, nº 10",
        "EE_Relacao": "Pai"
    }]
    
    df = pd.DataFrame(example_data, columns=columns)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Template Alunos')
    output.seek(0)
    
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        headers={"Content-Disposition": "attachment; filename=template_alunos.xlsx"}
    )

@router.get("/data/export")
def export_students(db: Session = Depends(get_db)):
    """Exporta alunos para Excel corrigindo o formato do Enum de género."""
    alunos = db.query(models.Aluno).options(joinedload(models.Aluno.turma_obj), joinedload(models.Aluno.encarregado_educacao)).all()
    
    data = []
    for a in alunos:
        # CORREÇÃO: Extrair o valor do Enum para string limpa ("M" ou "F")
        genero_val = a.Genero.value if hasattr(a.Genero, 'value') else str(a.Genero)
        
        data.append({
            "Nome": a.Nome,
            "Data_Nasc": a.Data_Nasc,
            "Genero (M/F)": genero_val, # Valor limpo
            "Telefone": a.Telefone,
            "Ano": a.turma_obj.Ano if a.turma_obj else None,
            "Turma (Letra)": a.turma_obj.Turma if a.turma_obj else None,
            "EE_Nome": a.encarregado_educacao.Nome if a.encarregado_educacao else None,
            "EE_Telefone": a.encarregado_educacao.Telefone if a.encarregado_educacao else None,
            "EE_Email": a.encarregado_educacao.Email if a.encarregado_educacao else None,
            "EE_Morada": a.encarregado_educacao.Morada if a.encarregado_educacao else None,
            "EE_Relacao": a.encarregado_educacao.Relacao if a.encarregado_educacao else None,
        })
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Alunos')
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=alunos_export.xlsx"}
    )

@router.post("/data/import")
async def import_students(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Importa alunos e ignora a linha de exemplo se ela existir."""
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Substituir NaN por None
        df = df.where(pd.notnull(df), None)
        
        count_success = 0
        
        for index, row in df.iterrows():
            try:
                # CORREÇÃO: Ignorar a linha de exemplo do template
                # Se o Ano for uma string com traço (ex: "5-12") ou o Nome começar por "Ex:", saltamos.
                if str(row.get("Ano", "")).find("-") != -1 or str(row.get("Nome", "")).startswith("Ex:"):
                    continue

                # 1. Criar EE
                novo_ee = models.EncarregadoEducacao(
                    Nome=str(row["EE_Nome"]),
                    Telefone=str(row["EE_Telefone"]),
                    Email=str(row["EE_Email"]) if row["EE_Email"] else None,
                    Morada=str(row["EE_Morada"]) if row["EE_Morada"] else None,
                    Relacao=str(row["EE_Relacao"]) if row["EE_Relacao"] else "Enc. Educação"
                )
                db.add(novo_ee)
                db.flush() 
                
                # 2. Encontrar Turma
                turma_id = None
                # Garantir que Ano é tratado como inteiro
                ano_val = int(row["Ano"]) if row["Ano"] and str(row["Ano"]).isdigit() else 10
                turma_letra = str(row["Turma (Letra)"]) if row["Turma (Letra)"] else "A"

                turma = db.query(models.Turma).filter(
                    models.Turma.Ano == ano_val,
                    models.Turma.Turma == turma_letra
                ).first()
                if turma:
                    turma_id = turma.Turma_id
                
                # 3. Criar Aluno
                novo_aluno = models.Aluno(
                    Nome=str(row["Nome"]),
                    Data_Nasc=row["Data_Nasc (AAAA-MM-DD)"],
                    Genero=str(row["Genero (M/F)"]),
                    Telefone=str(row["Telefone"]) if row["Telefone"] else None,
                    Ano=ano_val,
                    Turma_id=turma_id,
                    EE_id=novo_ee.EE_id
                )
                db.add(novo_aluno)
                count_success += 1
                
            except Exception as e:
                print(f"Erro na linha {index}: {e}")
                continue
                
        db.commit()
        return {"message": f"Importação concluída. {count_success} alunos criados."}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar ficheiro: {str(e)}")