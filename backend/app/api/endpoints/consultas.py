from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from app.db.database import get_db
from app.db import models, schemas

router = APIRouter()

def verificar_reprovacao_aluno(ano_escolar: int, negativas: int, notas_aluno, id_pt, id_mat):
    """
    Aplica as regras oficiais de retenção conforme definido em turmas.py.
    """
    if 5 <= ano_escolar <= 8:
        return negativas > 3
    elif ano_escolar == 9:
        if negativas > 2:
            return True
        if negativas == 2:
            # Verifica se as negativas são simultaneamente em PT e MAT
            tem_nega_pt = any(n.Nota_Final < 10 and n.Disc_id == id_pt for n in notas_aluno)
            tem_nega_mat = any(n.Nota_Final < 10 and n.Disc_id == id_mat for n in notas_aluno)
            return tem_nega_pt and tem_nega_mat
        return False
    elif 10 <= ano_escolar <= 11:
        tem_nota_critica = any(n.Nota_Final < 6 for n in notas_aluno)
        return negativas > 2 or tem_nota_critica
    elif ano_escolar == 12:
        return negativas > 0
    return False

@router.get("/", response_model=schemas.ConsultasGeraisResponse)
def obter_consultas_estatisticas(ano_letivo: str = None, db: Session = Depends(get_db)):
    if not ano_letivo:
        ultima_t = db.query(models.Turma).order_by(desc(models.Turma.AnoLetivo)).first()
        ano_letivo = ultima_t.AnoLetivo if ultima_t else "2024/2025"

    # CORREÇÃO AQUI: Usar .first() em vez de .scalar() para evitar o erro MultipleResultsFound
    id_pt = db.query(models.Disciplina.Disc_id).filter(models.Disciplina.Nome.ilike("%português%")).first()
    id_mat = db.query(models.Disciplina.Disc_id).filter(models.Disciplina.Nome.ilike("%matemática%")).first()
    
    # Extrair apenas o ID se o objeto existir
    id_pt = id_pt[0] if id_pt else None
    id_mat = id_mat[0] if id_mat else None

    # 1. MELHORES ALUNOS (Top 5 por Turma)
    query_base = db.query(
        models.Aluno.Aluno_id, models.Aluno.Nome, models.Turma.Turma, models.Turma.Ano, models.Turma.Turma_id,
        func.avg(models.Nota.Nota_Final).label('media')
    ).join(models.Matricula, models.Aluno.Aluno_id == models.Matricula.Aluno_id)\
     .join(models.Turma, models.Matricula.Turma_id == models.Turma.Turma_id)\
     .join(models.Nota, and_(models.Nota.Aluno_id == models.Aluno.Aluno_id, models.Nota.Ano_letivo == models.Turma.AnoLetivo))\
     .filter(models.Turma.AnoLetivo == ano_letivo)\
     .group_by(models.Aluno.Aluno_id, models.Turma.Turma_id)\
     .order_by(models.Turma.Ano, models.Turma.Turma, desc('media'))

    resultados_alunos = query_base.all()
    lista_top_alunos = []
    contagem = {}

    for a in resultados_alunos:
        tid = a[4]
        contagem[tid] = contagem.get(tid, 0)
        if contagem[tid] < 5:
            lista_top_alunos.append({
                "aluno_id": a[0], "nome": a[1], "turma": f"{a[3]}º{a[2]}", "media": round(float(a[5]), 2) if a[5] else 0.0
            })
            contagem[tid] += 1

    # 2. ALUNOS REPROVADOS
    alunos_ano = db.query(models.Aluno).join(models.Matricula).join(models.Turma)\
                   .filter(models.Turma.AnoLetivo == ano_letivo).all()
    
    lista_reprovados = []
    for aluno in alunos_ano:
        notas = db.query(models.Nota).filter(models.Nota.Aluno_id == aluno.Aluno_id, models.Nota.Ano_letivo == ano_letivo).all()
        negativas = sum(1 for n in notas if n.Nota_Final < 10)
        
        matricula = next((m for m in aluno.matriculas if m.turma.AnoLetivo == ano_letivo), None)
        if not matricula: continue
        
        if verificar_reprovacao_aluno(matricula.turma.Ano, negativas, notas, id_pt, id_mat):
            lista_reprovados.append({
                "aluno_id": aluno.Aluno_id,
                "nome": aluno.Nome,
                "turma": f"{matricula.turma.Ano}º{matricula.turma.Turma}",
                "ano": matricula.turma.Ano,
                "negativas": negativas,
                "motivo": "Retenção por avaliação insuficiente"
            })

    lista_reprovados.sort(key=lambda x: (x['ano'], x['turma']))

    # 3. PERFORMANCE DE PROFESSORES
    profs_media = db.query(
        models.Professor.Professor_id, models.Professor.Nome, models.Disciplina.Nome.label('disc_nome'),
        func.avg(models.Nota.Nota_Final).label('m')
    ).select_from(models.Professor)\
     .join(models.TurmaDisciplina, models.Professor.Professor_id == models.TurmaDisciplina.Professor_id)\
     .join(models.Disciplina, models.TurmaDisciplina.Disc_id == models.Disciplina.Disc_id)\
     .join(models.Turma, models.TurmaDisciplina.Turma_id == models.Turma.Turma_id)\
     .join(models.Matricula, models.Turma.Turma_id == models.Matricula.Turma_id)\
     .join(models.Nota, and_(
         models.Nota.Aluno_id == models.Matricula.Aluno_id,
         models.Nota.Disc_id == models.Disciplina.Disc_id,
         models.Nota.Ano_letivo == models.Turma.AnoLetivo
     ))\
     .filter(models.Turma.AnoLetivo == ano_letivo)\
     .group_by(models.Professor.Professor_id, models.Disciplina.Disc_id)\
     .order_by(desc('m')).all()

    return {
        "top_alunos_turma": lista_top_alunos,
        "alunos_reprovacao": lista_reprovados,
        "top_professores": [
            {"professor_id": p[0], "nome": p[1], "disciplina": p[2], "media_alunos": round(float(p[3]), 2) if p[3] else 0.0} 
            for p in profs_media[:10]
        ],
        "bottom_professores": [
            {"professor_id": p[0], "nome": p[1], "disciplina": p[2], "media_alunos": round(float(p[3]), 2) if p[3] else 0.0} 
            for p in reversed(profs_media[-5:])
        ]
    }