from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db import models
from app.db import schemas 
import pandas as pd
import io
from fastapi.responses import StreamingResponse

router = APIRouter()

# --- ENDPOINTS DE LEITURA ---

@router.get("/", response_model=List[Any])
def read_turmas(db: Session = Depends(get_db)):
    turmas = db.query(models.Turma).all()
    return [{"id": t.Turma_id, "nome": f"{t.Ano}º {t.Turma}", "ano_letivo": t.AnoLetivo} for t in turmas]

@router.get("/{turma_id}/details")
def get_turma_details(turma_id: int, db: Session = Depends(get_db)):
    # 1. Obter a Turma
    turma = db.query(models.Turma).options(joinedload(models.Turma.diretor_turma)).filter(models.Turma.Turma_id == turma_id).first()
    if not turma: raise HTTPException(404, "Turma não encontrada")

    # 2. Obter Professores e Disciplinas ATIVAS desta turma
    turma_discs = db.query(models.TurmaDisciplina)\
        .options(joinedload(models.TurmaDisciplina.disciplina), joinedload(models.TurmaDisciplina.professor))\
        .filter(models.TurmaDisciplina.Turma_id == turma_id).all()
    
    lista_professores = []
    for td in turma_discs:
        lista_professores.append({
            "disciplina_id": td.Disc_id,
            "disciplina": td.disciplina.Nome,
            "professor": td.professor.Nome if td.professor else "Por Atribuir",
            "professor_id": td.Professor_id
        })

    # 3. Obter Alunos (VIA MATRÍCULA)
    matriculas = db.query(models.Matricula).options(joinedload(models.Matricula.aluno)).filter(models.Matricula.Turma_id == turma_id).all()
    alunos = [m.aluno for m in matriculas if m.aluno]
    lista_alunos = [{"id": a.Aluno_id, "nome": a.Nome, "foto": "avatar.png"} for a in alunos]

    # 4. Obter Notas Existentes
    aluno_ids = [a.Aluno_id for a in alunos]
    notas_db = db.query(models.Nota).filter(
        models.Nota.Aluno_id.in_(aluno_ids), 
        models.Nota.Ano_letivo == turma.AnoLetivo
    ).all()
    
    # 5. GERAR LISTA FINAL
    lista_notas_final = []

    for aluno in alunos:
        for td in turma_discs:
            nota_real = next((n for n in notas_db if n.Aluno_id == aluno.Aluno_id and n.Disc_id == td.Disc_id), None)
            
            if nota_real:
                lista_notas_final.append({
                    "aluno_id": aluno.Aluno_id,
                    "aluno_nome": aluno.Nome,
                    "disciplina_id": td.Disc_id,
                    "disciplina_nome": td.disciplina.Nome,
                    "p1": nota_real.Nota_1P,
                    "p2": nota_real.Nota_2P,
                    "p3": nota_real.Nota_3P,
                    "exame": nota_real.Nota_Ex,  # <--- ADICIONADO LEITURA
                    "final": nota_real.Nota_Final
                })
            else:
                lista_notas_final.append({
                    "aluno_id": aluno.Aluno_id,
                    "aluno_nome": aluno.Nome,
                    "disciplina_id": td.Disc_id,
                    "disciplina_nome": td.disciplina.Nome,
                    "p1": 0, "p2": 0, "p3": 0, "exame": 0, "final": 0 # <--- ADICIONADO DEFAULT
                })

    return {
        "info": {
            "id": turma.Turma_id, 
            "nome": f"{turma.Ano}º {turma.Turma}", 
            "ano_int": turma.Ano, 
            "turma_char": turma.Turma, 
            "ano_letivo": turma.AnoLetivo, 
            "diretor": turma.diretor_turma.Nome if turma.diretor_turma else "N/A"
        }, 
        "professores": lista_professores, 
        "alunos": lista_alunos, 
        "notas": lista_notas_final
    }

# --- ENDPOINTS DE ESCRITA ---

@router.post("/{turma_id}/notas")
def update_grade(turma_id: int, nota: schemas.NotaTurmaPayload, db: Session = Depends(get_db)): 
    turma = db.query(models.Turma).filter(models.Turma.Turma_id == turma_id).first()
    if not turma: raise HTTPException(404, "Turma não encontrada")

    nota_db = db.query(models.Nota).filter(
        models.Nota.Aluno_id == nota.aluno_id,
        models.Nota.Disc_id == nota.disciplina_id,
        models.Nota.Ano_letivo == turma.AnoLetivo
    ).first()

    if nota_db:
        if nota.p1 is not None: nota_db.Nota_1P = nota.p1
        if nota.p2 is not None: nota_db.Nota_2P = nota.p2
        if nota.p3 is not None: nota_db.Nota_3P = nota.p3
        if nota.exame is not None: nota_db.Nota_Ex = nota.exame # <--- ADICIONADO UPDATE
        if nota.final is not None: nota_db.Nota_Final = nota.final
    else:
        nova_nota = models.Nota(
            Aluno_id=nota.aluno_id, Disc_id=nota.disciplina_id, Ano_letivo=turma.AnoLetivo,
            Nota_1P=nota.p1 or 0, Nota_2P=nota.p2 or 0, Nota_3P=nota.p3 or 0, 
            Nota_Ex=nota.exame or 0, # <--- ADICIONADO CREATE
            Nota_Final=nota.final or 0
        )
        db.add(nova_nota)
    
    db.commit()
    return {"message": "Nota atualizada"}

@router.put("/{turma_id}/professores")
def update_turma_professores(turma_id: int, dados: schemas.TurmaProfessoresUpdate, db: Session = Depends(get_db)): 
    turma = db.query(models.Turma).filter(models.Turma.Turma_id == turma_id).first()
    if not turma: raise HTTPException(404, "Turma não encontrada")

    db.query(models.TurmaDisciplina).filter(models.TurmaDisciplina.Turma_id == turma_id).delete()
    
    for item in dados.professores:
        db.add(models.TurmaDisciplina(
            Turma_id=turma_id,
            Disc_id=item.disciplina_id,
            Professor_id=item.professor_id
        ))
    
    try:
        db.commit()
        return {"message": "Equipa docente atualizada"}
    except Exception as e:
        db.rollback()
        raise HTTPException(400, f"Erro: {str(e)}")

# --- TRANSIÇÃO GLOBAL INTELIGENTE ---

def get_disciplina_id_por_nome(db: Session, termo: str) -> Optional[int]:
    disc = db.query(models.Disciplina).filter(models.Disciplina.Nome.ilike(f"%{termo}%")).first()
    return disc.Disc_id if disc else None

@router.post("/transitar-global")
def transitar_ano_global(regras: schemas.RegrasTransicao, db: Session = Depends(get_db)): 
    """
    Transição Global com:
    1. Regras de Ensino PT
    2. Criação de Matrículas (Histórico)
    """
    ultima_turma = db.query(models.Turma).order_by(models.Turma.Turma_id.desc()).first()
    if not ultima_turma: raise HTTPException(400, "Sem turmas.")
    
    ano_atual_str = ultima_turma.AnoLetivo
    partes = ano_atual_str.split("/")
    novo_ano_letivo = f"{int(partes[0])+1}/{int(partes[1])+1}"
    
    id_pt = get_disciplina_id_por_nome(db, "português")
    id_mat = get_disciplina_id_por_nome(db, "matemática")

    stats = {"transitados": 0, "retidos": 0, "finalistas": 0, "turmas_criadas": 0}
    turmas_antigas = db.query(models.Turma).filter(models.Turma.AnoLetivo == ano_atual_str).all()

    for t_antiga in turmas_antigas:
        novo_ano_escolar = t_antiga.Ano + 1
        eh_12_ano = t_antiga.Ano == 12
        if eh_12_ano: novo_ano_escolar = 12 

        # 1. Criar Turma Aprovados (Destino)
        turma_aprovados = None
        if not eh_12_ano:
            turma_aprovados = db.query(models.Turma).filter(models.Turma.AnoLetivo == novo_ano_letivo, models.Turma.Ano == novo_ano_escolar, models.Turma.Turma == t_antiga.Turma).first()
            if not turma_aprovados:
                turma_aprovados = models.Turma(Ano=novo_ano_escolar, Turma=t_antiga.Turma, AnoLetivo=novo_ano_letivo, DiretorT=t_antiga.DiretorT)
                db.add(turma_aprovados); db.commit(); db.refresh(turma_aprovados)
                stats["turmas_criadas"] += 1
                for pd in db.query(models.TurmaDisciplina).filter(models.TurmaDisciplina.Turma_id == t_antiga.Turma_id).all():
                    db.add(models.TurmaDisciplina(Turma_id=turma_aprovados.Turma_id, Disc_id=pd.Disc_id, Professor_id=pd.Professor_id))

        # 2. Criar Turma Retidos (Origem no novo ano)
        turma_retidos = db.query(models.Turma).filter(models.Turma.AnoLetivo == novo_ano_letivo, models.Turma.Ano == t_antiga.Ano, models.Turma.Turma == t_antiga.Turma).first()
        if not turma_retidos:
            turma_retidos = models.Turma(Ano=t_antiga.Ano, Turma=t_antiga.Turma, AnoLetivo=novo_ano_letivo, DiretorT=t_antiga.DiretorT)
            db.add(turma_retidos); db.commit(); db.refresh(turma_retidos)
            stats["turmas_criadas"] += 1
            for pd in db.query(models.TurmaDisciplina).filter(models.TurmaDisciplina.Turma_id == t_antiga.Turma_id).all():
                db.add(models.TurmaDisciplina(Turma_id=turma_retidos.Turma_id, Disc_id=pd.Disc_id, Professor_id=pd.Professor_id))

        # 3. Processar Alunos (VIA MATRÍCULA ANTIGA)
        matriculas_antigas = db.query(models.Matricula).filter(models.Matricula.Turma_id == t_antiga.Turma_id).all()
        
        for mat in matriculas_antigas:
            aluno = mat.aluno
            if not aluno: continue

            notas = db.query(models.Nota).filter(models.Nota.Aluno_id == aluno.Aluno_id, models.Nota.Ano_letivo == ano_atual_str).all()
            negativas_count = sum(1 for n in notas if n.Nota_Final < 10)
            
            # --- Regras de Aprovação PT ---
            aprovado = True
            
            # 5º ao 8º
            if 5 <= t_antiga.Ano <= 8:
                if negativas_count > 3: aprovado = False
            
            # 9º Ano
            elif t_antiga.Ano == 9:
                if negativas_count > 2: aprovado = False
                elif negativas_count == 2:
                    tem_nega_pt = any(n.Nota_Final < 10 and n.Disc_id == id_pt for n in notas)
                    tem_nega_mat = any(n.Nota_Final < 10 and n.Disc_id == id_mat for n in notas)
                    if tem_nega_pt and tem_nega_mat: aprovado = False
            
            # Secundário (10º e 11º)
            elif 10 <= t_antiga.Ano <= 11:
                tem_nota_minima = any(n.Nota_Final < 6 for n in notas)
                if negativas_count > 2 or tem_nota_minima: aprovado = False
            
            # 12º Ano
            elif t_antiga.Ano == 12:
                if negativas_count > 0: aprovado = False
                else:
                    # Finalista
                    aluno.Turma_id = None 
                    stats["finalistas"] += 1
                    continue

            # --- APLICAR DECISÃO & CRIAR MATRÍCULA ---
            nova_turma_destino = None
            
            if aprovado:
                nova_turma_destino = turma_aprovados
                stats["transitados"] += 1
                aluno.Ano = novo_ano_escolar 
            else:
                nova_turma_destino = turma_retidos
                stats["retidos"] += 1
            
            if nova_turma_destino:
                # 1. Atualiza ponteiro "Turma Atual"
                aluno.Turma_id = nova_turma_destino.Turma_id
                
                # 2. CRIA MATRÍCULA NO NOVO ANO
                nova_matricula = models.Matricula(Aluno_id=aluno.Aluno_id, Turma_id=nova_turma_destino.Turma_id)
                db.add(nova_matricula)

    db.commit()
    return {"message": "Transição concluída com matrículas.", "detalhes": stats, "novo_ano": novo_ano_letivo}

# --- ENDPOINT DE EXPORTAÇÃO ---

@router.get("/{turma_id}/export")
def export_turma_completa(turma_id: int, db: Session = Depends(get_db)):
    """
    Gera um Excel com:
    1. Folha de Docentes
    2. Folha de Alunos
    3. Uma folha por Disciplina com as notas
    """
    turma = db.query(models.Turma).filter(models.Turma.Turma_id == turma_id).first()
    if not turma: raise HTTPException(status_code=404, detail="Turma não encontrada")

    matriculas = db.query(models.Matricula).filter(models.Matricula.Turma_id == turma_id).all()
    alunos = [m.aluno for m in matriculas if m.aluno]
    alunos.sort(key=lambda x: x.Nome)
    
    turma_discs = db.query(models.TurmaDisciplina)\
        .options(joinedload(models.TurmaDisciplina.disciplina), joinedload(models.TurmaDisciplina.professor))\
        .filter(models.TurmaDisciplina.Turma_id == turma_id).all()

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        
        # FOLHA 1: DOCENTES
        data_docentes = []
        for td in turma_discs:
            data_docentes.append({
                "Disciplina": td.disciplina.Nome,
                "Professor": td.professor.Nome if td.professor else "Por Atribuir",
                "Email": td.professor.email if td.professor else "-"
            })
        df_docentes = pd.DataFrame(data_docentes)
        df_docentes.to_excel(writer, sheet_name="Equipa Docente", index=False)

        # FOLHA 2: ALUNOS
        data_alunos = []
        for aluno in alunos:
            data_alunos.append({
                "ID": aluno.Aluno_id,
                "Nome": aluno.Nome,
                "Data Nasc": aluno.Data_Nasc,
                "Telefone": aluno.Telefone,
                "EE Nome": aluno.encarregado_educacao.Nome if aluno.encarregado_educacao else "",
                "EE Contacto": aluno.encarregado_educacao.Telefone if aluno.encarregado_educacao else ""
            })
        df_alunos = pd.DataFrame(data_alunos)
        df_alunos.to_excel(writer, sheet_name="Alunos", index=False)

        # FOLHAS 3...N: NOTAS
        for td in turma_discs:
            disc_nome = td.disciplina.Nome
            sheet_name = disc_nome.replace("/", "-").replace("\\", "-")[:30]
            
            data_notas = []
            for aluno in alunos:
                nota = db.query(models.Nota).filter(
                    models.Nota.Aluno_id == aluno.Aluno_id,
                    models.Nota.Disc_id == td.Disc_id,
                    models.Nota.Ano_letivo == turma.AnoLetivo
                ).first()
                
                data_notas.append({
                    "Aluno ID": aluno.Aluno_id,
                    "Nome Aluno": aluno.Nome,
                    "1ºP": nota.Nota_1P if nota else 0,
                    "2ºP": nota.Nota_2P if nota else 0,
                    "3ºP": nota.Nota_3P if nota else 0,
                    "Exame": nota.Nota_Ex if nota else 0, # <--- EXPORT INCLUÍDO
                    "Nota Final": nota.Nota_Final if nota else 0
                })
            
            df_notas = pd.DataFrame(data_notas)
            df_notas.to_excel(writer, sheet_name=sheet_name, index=False)

    output.seek(0)
    filename = f"Pauta_{turma.Ano}{turma.Turma}_{turma.AnoLetivo.replace('/', '-')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )