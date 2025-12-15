from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db import models
from app.db import schemas
import pandas as pd
import io

router = APIRouter()

# --- 0. OBTER ANOS LETIVOS (NOVO) ---
@router.get("/anos-letivos")
def get_anos_letivos(db: Session = Depends(get_db)):
    """Retorna lista de anos letivos disponíveis no sistema (ex: 2023/2024)."""
    # Procura anos distintos na tabela de Turmas
    anos = db.query(models.Turma.AnoLetivo).distinct().all()
    # Converte lista de tuplas [('2023/2024',), ...] para lista simples
    lista = [a[0] for a in anos if a[0]]
    lista.sort(reverse=True) # Mais recentes primeiro
    return lista

# --- 1. LISTAR ALUNOS (Com Histórico) ---
@router.get("/", response_model=List[schemas.AlunoListagem])
def read_students(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None, 
    turma_id: Optional[int] = None, 
    ano_letivo: Optional[str] = None, # NOVO FILTRO
    sort_by: Optional[str] = "id",
    db: Session = Depends(get_db)
):
    # Base Query
    query = db.query(models.Aluno).options(
        joinedload(models.Aluno.turma), 
        joinedload(models.Aluno.encarregado_educacao),
        joinedload(models.Aluno.matriculas).joinedload(models.Matricula.turma) # Carregar histórico
    )

    # Filtro: Ano Letivo (Logica de Histórico)
    if ano_letivo:
        # Junta com Matrículas e Turmas para filtrar pelo Ano Letivo escolhido
        query = query.join(models.Matricula).join(models.Turma).filter(models.Turma.AnoLetivo == ano_letivo)
    
    # Filtro: Pesquisa Nome
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(models.Aluno.Nome.ilike(search_fmt))
    
    # Filtro: Turma Específica (ID)
    if turma_id:
        # Se filtramos por ID de turma, usamos a matricula para garantir consistência
        query = query.filter(models.Aluno.matriculas.any(models.Matricula.Turma_id == turma_id))

    # Ordenação
    if sort_by == "name":
        query = query.order_by(models.Aluno.Nome)
    else:
        query = query.order_by(models.Aluno.Aluno_id)

    # Paginação
    alunos_query = query.offset(skip).limit(limit).all()

    results = []
    for aluno in alunos_query:
        # Lógica para decidir qual turma mostrar
        turma_obj = None
        
        if ano_letivo:
            # Se selecionamos um ano, procuramos a matrícula desse ano específico
            # para mostrar "7ºA" (do passado) e não "8ºA" (atual)
            matricula_desse_ano = next(
                (m for m in aluno.matriculas if m.turma and m.turma.AnoLetivo == ano_letivo), 
                None
            )
            if matricula_desse_ano:
                turma_obj = matricula_desse_ano.turma
        else:
            # Se não há filtro de ano, mostra a turma atual
            turma_obj = aluno.turma

        # Preparar dados para o schema
        turma_str = "Sem Turma"
        t_ano = 0
        t_letra = ""
        
        if turma_obj:
            turma_str = f"{turma_obj.Ano}º {turma_obj.Turma}"
            t_ano = turma_obj.Ano
            t_letra = turma_obj.Turma

        # Dados do EE
        ee_nome, ee_tel, ee_email, ee_morada, ee_relacao = "N/A", None, None, None, None
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
    # 1. Criar o Encarregado de Educação primeiro
    novo_ee = models.EncarregadoEducacao(
        Nome=aluno_in.EE_Nome,
        Telefone=aluno_in.EE_Telefone,
        Email=aluno_in.EE_Email,
        Morada=aluno_in.EE_Morada,
        Relacao=aluno_in.EE_Relacao
    )
    db.add(novo_ee)
    db.commit()      # Commit para garantir que o ID é gerado
    db.refresh(novo_ee)

    # 2. Procurar a Turma selecionada
    turma = db.query(models.Turma).filter(
        models.Turma.Ano == aluno_in.Ano,
        models.Turma.Turma == aluno_in.Turma_Letra
    ).order_by(models.Turma.Turma_id.desc()).first()
    
    turma_id = turma.Turma_id if turma else None

    # 3. Criar o Aluno
    # AQUI ESTAVA O ERRO: Tem de ser 'Enc_Educacao_id' e não 'EE_id'
    novo_aluno = models.Aluno(
        Nome=aluno_in.Nome,
        Data_Nasc=aluno_in.Data_Nasc,
        Genero=aluno_in.Genero,
        Telefone=aluno_in.Telefone,
        Turma_id=turma_id,
        Enc_Educacao_id=novo_ee.EE_id, 
        Ano=aluno_in.Ano
    )
    db.add(novo_aluno)
    db.commit()
    db.refresh(novo_aluno)

    # 4. CRIAR A MATRÍCULA (Fundamental para o histórico funcionar)
    if turma_id:
        nova_matricula = models.Matricula(
            Aluno_id=novo_aluno.Aluno_id,
            Turma_id=turma_id
        )
        db.add(nova_matricula)
        db.commit()

    # Preparar resposta
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
        "Telefone": novo_aluno.Telefone,
        "EE_Email": novo_ee.Email,
        "EE_Morada": novo_ee.Morada,
        "EE_Relacao": novo_ee.Relacao
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

    # Se mudar a turma, atualizamos o ponteiro E verificamos matrículas
    if dados.Ano is not None and dados.Turma_Letra is not None:
        nova_turma = db.query(models.Turma).filter(
            models.Turma.Ano == dados.Ano,
            models.Turma.Turma == dados.Turma_Letra
        ).order_by(models.Turma.Turma_id.desc()).first()
        
        if nova_turma:
            db_aluno.Turma_id = nova_turma.Turma_id
            
            # Verificar se já existe matrícula nesta turma, senão cria
            existe_mat = db.query(models.Matricula).filter(
                models.Matricula.Aluno_id == aluno_id,
                models.Matricula.Turma_id == nova_turma.Turma_id
            ).first()
            
            if not existe_mat:
                db.add(models.Matricula(Aluno_id=aluno_id, Turma_id=nova_turma.Turma_id))

    if db_aluno.encarregado_educacao:
        ee = db_aluno.encarregado_educacao
        if dados.EE_Nome: ee.Nome = dados.EE_Nome
        if dados.EE_Telefone: ee.Telefone = dados.EE_Telefone
        if dados.EE_Email: ee.Email = dados.EE_Email
        if dados.EE_Morada: ee.Morada = dados.EE_Morada
        if dados.EE_Relacao: ee.Relacao = dados.EE_Relacao

    db.commit()
    db.refresh(db_aluno)
    
    turma = db_aluno.turma # Corrigido de turma_obj para turma
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
    
    # Nota: Com matrículas e notas, apagar um aluno pode ser complexo.
    # O ideal é usar cascade na DB ou apagar dependências aqui.
    db.query(models.Matricula).filter(models.Matricula.Aluno_id == aluno_id).delete()
    db.query(models.Nota).filter(models.Nota.Aluno_id == aluno_id).delete()
    
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

# --- 5. IMPORT / EXPORT ---

@router.get("/data/template")
def get_student_template():
    columns = [
        "Nome", "Data_Nasc (AAAA-MM-DD)", "Genero (M/F)", "Telefone", 
        "Ano", "Turma (Letra)", "Ano_Letivo", 
        "EE_Nome", "EE_Telefone", "EE_Email", "EE_Morada", "EE_Relacao"
    ]
    example_data = [{
        "Nome": "Ex: João Silva",
        "Data_Nasc (AAAA-MM-DD)": "2008-05-20",
        "Genero (M/F)": "M",
        "Telefone": "912345678",
        "Ano": "10",
        "Turma (Letra)": "A",
        "Ano_Letivo": "2024/2025", 
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

# Em backend/app/api/endpoints/students.py

@router.get("/data/export")
def export_students(ano_letivo: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Exporta alunos baseando-se nas MATRÍCULAS.
    Força o JOIN explícito para garantir que filtramos pelo ano da matrícula.
    """
    print(f"DEBUG: A iniciar exportação. Filtro recebido: {ano_letivo}") # Log para veres no terminal

    # Query explícita: Matricula -> junta com Turma -> junta com Aluno -> junta com EE
    # Usamos o outerjoin no EE para garantir que alunos sem EE (se existirem) também aparecem
    query = db.query(models.Matricula)\
        .join(models.Turma, models.Matricula.Turma_id == models.Turma.Turma_id)\
        .join(models.Aluno, models.Matricula.Aluno_id == models.Aluno.Aluno_id)\
        .outerjoin(models.EncarregadoEducacao, models.Aluno.Enc_Educacao_id == models.EncarregadoEducacao.EE_id)\
        .options(
            joinedload(models.Matricula.turma),
            joinedload(models.Matricula.aluno).joinedload(models.Aluno.encarregado_educacao)
        )

    # Aplica o filtro se foi enviado e não for "Todos"
    if ano_letivo and ano_letivo != "Todos" and ano_letivo != "":
        query = query.filter(models.Turma.AnoLetivo == ano_letivo)
    
    matriculas = query.all()
    print(f"DEBUG: Foram encontradas {len(matriculas)} matrículas.") # Log importante

    data = []
    for mat in matriculas:
        aluno = mat.aluno
        turma = mat.turma
        ee = aluno.encarregado_educacao if aluno else None

        if not aluno: 
            continue

        genero_val = aluno.Genero.value if hasattr(aluno.Genero, 'value') else str(aluno.Genero)
        
        data.append({
            "Nome": aluno.Nome,
            "Data_Nasc": aluno.Data_Nasc,
            "Genero (M/F)": genero_val,
            "Telefone": aluno.Telefone,
            "Ano": turma.Ano if turma else None,
            "Turma (Letra)": turma.Turma if turma else None,
            "Ano_Letivo": turma.AnoLetivo if turma else None, 
            "EE_Nome": ee.Nome if ee else "",
            "EE_Telefone": ee.Telefone if ee else "",
            "EE_Email": ee.Email if ee else "",
            "EE_Morada": ee.Morada if ee else "",
            "EE_Relacao": ee.Relacao if ee else "",
        })
    
    if not data:
        print("AVISO: A lista de dados final está vazia!")

    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Alunos')
    output.seek(0)
    
    # Nome do ficheiro dinâmico
    safe_ano = ano_letivo.replace('/', '-') if ano_letivo else "geral"
    filename = f"alunos_{safe_ano}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/data/import")
async def import_students(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df = df.where(pd.notnull(df), None)
        count_success = 0
        
        for index, row in df.iterrows():
            try:
                # Ignorar linhas de exemplo ou vazias
                if str(row.get("Nome", "")).startswith("Ex:") or not row.get("Nome"): continue

                # 1. EE
                novo_ee = models.EncarregadoEducacao(
                    Nome=str(row["EE_Nome"]),
                    Telefone=str(row["EE_Telefone"]),
                    Email=str(row["EE_Email"]) if row["EE_Email"] else None,
                    Morada=str(row["EE_Morada"]) if row["EE_Morada"] else None,
                    Relacao=str(row["EE_Relacao"]) if row["EE_Relacao"] else "Enc. Educação"
                )
                db.add(novo_ee)
                db.flush() 
                
                # 2. Turma (Procurar Pelo Ano Letivo indicado no Excel)
                turma_id = None
                ano_val = int(row["Ano"]) if row["Ano"] and str(row["Ano"]).isdigit() else 10
                turma_letra = str(row["Turma (Letra)"]) if row["Turma (Letra)"] else "A"
                
                # Se o Excel não tiver Ano_Letivo, assume o atual do sistema ou "2024/2025"
                ano_letivo_val = str(row["Ano_Letivo"]) if row.get("Ano_Letivo") else "2024/2025"

                turma = db.query(models.Turma).filter(
                    models.Turma.Ano == ano_val,
                    models.Turma.Turma == turma_letra,
                    models.Turma.AnoLetivo == ano_letivo_val
                ).first()
                
                if turma: turma_id = turma.Turma_id
                
                # 3. Aluno
                # Usar Enc_Educacao_id (nome correto da coluna)
                # Converter Data_Nasc para string para evitar erros
                data_nasc_val = str(row["Data_Nasc (AAAA-MM-DD)"]) if row.get("Data_Nasc (AAAA-MM-DD)") else None
                
                novo_aluno = models.Aluno(
                    Nome=str(row["Nome"]),
                    Data_Nasc=data_nasc_val,
                    Genero=str(row["Genero (M/F)"]),
                    Telefone=str(row["Telefone"]) if row["Telefone"] else None,
                    Turma_id=turma_id, 
                    Enc_Educacao_id=novo_ee.EE_id,
                    Ano=ano_val
                )
                db.add(novo_aluno)
                db.flush()

                # 4. CRIAR MATRÍCULA
                if turma_id:
                    # Verifica se já existe para não duplicar na importação
                    exists = db.query(models.Matricula).filter(
                        models.Matricula.Aluno_id == novo_aluno.Aluno_id,
                        models.Matricula.Turma_id == turma_id
                    ).first()
                    if not exists:
                        db.add(models.Matricula(Aluno_id=novo_aluno.Aluno_id, Turma_id=turma_id))
                
                count_success += 1
                
            except Exception as e:
                print(f"Erro na linha {index}: {e}")
                continue
                
        db.commit()
        return {"message": f"Importação concluída. {count_success} alunos criados."}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar ficheiro: {str(e)}")