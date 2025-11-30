import os
import json
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import models
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def get_school_context(db: Session):
    """
    Coleta OMNISCIENTE da escola com PRÉ-PROCESSAMENTO ANALÍTICO.
    """
    contexto = {}

    # --- A. MAPEAMENTO DE PROFESSORES E DISCIPLINAS ---
    mapa_aulas = {} 
    
    # 1. Tentar carregar atribuições (Se existirem na BD)
    try:
        atribuicoes = (
            db.query(models.TurmaDisciplina, models.Professor, models.Disciplina, models.Turma)
            .join(models.Professor, models.TurmaDisciplina.Professor_id == models.Professor.Professor_id)
            .join(models.Disciplina, models.TurmaDisciplina.Disc_id == models.Disciplina.Disc_id)
            .join(models.Turma, models.TurmaDisciplina.Turma_id == models.Turma.Turma_id)
            .all()
        )
    except Exception:
        # Se a tabela estiver vazia ou der erro, continuamos sem crashar
        atribuicoes = []

    lista_atribuicoes_detalhada = []

    for td, prof, disc, turma in atribuicoes:
        chave = (td.Turma_id, td.Disc_id)
        mapa_aulas[chave] = {
            "Prof": prof.Nome,
            "Disc": disc.Nome,
            "Turma": f"{turma.Ano}º{turma.Turma}"
        }
        lista_atribuicoes_detalhada.append({
            "Professor": prof.Nome,
            "Disciplina": disc.Nome,
            "Turma": f"{turma.Ano}º{turma.Turma}",
            "Email": prof.email
        })

    # --- B. PROCESSAMENTO PROFUNDO DE NOTAS ---
    notas_query = (
        db.query(models.Nota, models.Aluno, models.Turma)
        .join(models.Aluno, models.Nota.Aluno_id == models.Aluno.Aluno_id)
        .join(models.Turma, models.Aluno.Turma_id == models.Turma.Turma_id)
        .all()
    )

    alunos_stats = {} 
    professores_stats = {} 

    for nota, aluno, turma in notas_query:
        if nota.Nota_Final is None: continue
        
        # Tentar recuperar Info da Disciplina (Se disponível no objeto Nota)
        # Nota: O models.Nota tem Disc_id, mas para saber o nome precisamos de join ou query extra
        # Para otimizar, assumimos que o ID é suficiente ou usamos o mapa_aulas se bater certo
        
        # Recuperar dados enriquecidos do mapa (se existir atribuição)
        aula_info = mapa_aulas.get((turma.Turma_id, nota.Disc_id), {"Prof": "N/A", "Disc": f"Disc #{nota.Disc_id}"})
        prof_nome = aula_info["Prof"]
        disc_nome = aula_info["Disc"]
        
        # Se o nome da disciplina vier "feio" (ID), tentamos ir buscar à tabela Disciplina
        if "Disc #" in disc_nome:
             d = db.query(models.Disciplina).filter(models.Disciplina.Disc_id == nota.Disc_id).first()
             if d: disc_nome = d.Nome

        # 1. Dados do Aluno
        if aluno.Aluno_id not in alunos_stats:
            alunos_stats[aluno.Aluno_id] = {
                "Nome": aluno.Nome, 
                "Turma": f"{turma.Ano}º{turma.Turma}", 
                "Notas": [],
                "Negativas": [],
                "Positivas": []
            }
        
        alunos_stats[aluno.Aluno_id]["Notas"].append(nota.Nota_Final)
        
        detalhe_nota = f"{disc_nome} ({nota.Nota_Final})"
        if prof_nome != "N/A": detalhe_nota += f" [{prof_nome}]"

        if nota.Nota_Final < 10:
            alunos_stats[aluno.Aluno_id]["Negativas"].append(detalhe_nota)
        elif nota.Nota_Final >= 16:
            alunos_stats[aluno.Aluno_id]["Positivas"].append(detalhe_nota)

        # 2. Dados do Professor (Performance)
        if prof_nome != "N/A":
            if prof_nome not in professores_stats:
                professores_stats[prof_nome] = {"Soma": 0, "Qtd": 0, "Turmas": set()}
            professores_stats[prof_nome]["Soma"] += nota.Nota_Final
            professores_stats[prof_nome]["Qtd"] += 1
            professores_stats[prof_nome]["Turmas"].add(f"{turma.Ano}º{turma.Turma}")

    # --- C. CONSTRUÇÃO DOS RANKINGS ---
    
    # 1. Ranking Alunos
    ranking_alunos = []
    for aid, dados in alunos_stats.items():
        # PROTEÇÃO CONTRA DIVISÃO POR ZERO
        qtd_notas = len(dados["Notas"])
        media = sum(dados["Notas"]) / qtd_notas if qtd_notas > 0 else 0
        
        ranking_alunos.append({
            "Nome": dados["Nome"],
            "Turma": dados["Turma"],
            "Media": round(media, 2),
            "N_Negativas": len(dados["Negativas"]),
            "Disciplinas_Criticas": dados["Negativas"],
            "Disciplinas_Forte": dados["Positivas"]
        })
    
    ranking_alunos.sort(key=lambda x: x["Media"], reverse=True)
    
    top_alunos = ranking_alunos[:10]
    risk_alunos = [a for a in ranking_alunos if a["N_Negativas"] > 0]
    risk_alunos.sort(key=lambda x: x["N_Negativas"], reverse=True)

    # 2. Ranking Professores
    ranking_profs = []
    for nome, stats in professores_stats.items():
        # PROTEÇÃO CONTRA DIVISÃO POR ZERO
        if stats["Qtd"] > 0:
            ranking_profs.append({
                "Professor": nome,
                "Media_Notas_Dadas": round(stats["Soma"] / stats["Qtd"], 2),
                "Total_Alunos": stats["Qtd"],
                "Turmas_Lecionadas": list(stats["Turmas"])
            })
    ranking_profs.sort(key=lambda x: x["Media_Notas_Dadas"], reverse=True)

    # --- D. RECURSOS HUMANOS ---
    staff_nao_docente = db.query(models.Staff).filter(models.Staff.role != "admin").all()
    lista_staff = [{"Nome": s.Nome, "Cargo": s.Cargo, "Email": s.email} for s in staff_nao_docente]

    # --- E. FINANÇAS ---
    transacoes = db.query(models.Transacao, models.Financiamento).outerjoin(models.Financiamento).order_by(models.Transacao.Data.desc()).limit(30).all()
    lista_financas = []
    for t, fin in transacoes:
        alerta = ""
        # Converter Decimal para float com segurança
        valor_float = float(t.Valor or 0)
        
        if t.Tipo == "Despesa" and fin and fin.Valor:
            orcamento_float = float(fin.Valor)
            if orcamento_float > 0 and valor_float > (orcamento_float * 0.2):
                alerta = "ALERTA: Despesa elevada única"
        
        lista_financas.append({
            "Data": str(t.Data),
            "Tipo": t.Tipo,
            "Valor": f"{valor_float}€",
            "Descricao": t.Descricao,
            "Projeto_Associado": fin.Tipo if fin else "Geral",
            "Status": alerta
        })

    # === PACOTE FINAL ===
    return {
        "METRICAS_GLOBAIS": {
            "Total_Alunos": len(ranking_alunos),
            "Media_Geral_Escola": round(sum(a["Media"] for a in ranking_alunos)/len(ranking_alunos), 2) if ranking_alunos else 0
        },
        "ALUNOS_DESTACADOS": {
            "Quadro_Honra_Top10": top_alunos,
            "Alunos_Em_Risco_Critico": risk_alunos[:15]
        },
        "CORPO_DOCENTE": {
            "Analise_Performance": ranking_profs,
            "Atribuicoes_Detalhadas": lista_atribuicoes_detalhada
        },
        "STAFF_APOIO": lista_staff,
        "FINANCAS_RECENTES": lista_financas
    }

def get_latest_report(db: Session):
    rec = db.query(models.AIRecommendation).order_by(models.AIRecommendation.AI_id.desc()).first()
    if rec and rec.Texto:
        try: return json.loads(rec.Texto)
        except: return None
    return None

def generate_and_save_insights(db: Session):
    if not client: return []
    try:
        dados = get_school_context(db)
        prompt = f"""
        És o Analista Sénior do SIGE. Tens acesso a dados pré-processados.
        
        DADOS: {json.dumps(dados, ensure_ascii=False)}
        
        TAREFA: Gera um relatório JSON detalhado.
        
        ESTRUTURA OBRIGATÓRIA:
        [
          {{
            "categoria": "...", "cor": "...", 
            "insights": [
              {{
                "tipo": "negativo/positivo",
                "titulo": "...",
                "descricao": "Resumo executivo.",
                "sugestao": "...",
                "detalhes": [] 
              }}
            ]
          }}
        ]
        IMPORTANTE: Copia as listas de 'ALUNOS_DESTACADOS' ou 'FINANCAS' para o campo 'detalhes'.
        """
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        res_json = json.loads(response.text)
        db.add(models.AIRecommendation(Texto=json.dumps(res_json, ensure_ascii=False)))
        db.commit()
        return res_json
    except Exception as e:
        print(f"Erro: {e}")
        return []

def chat_with_data(db: Session, user_message: str):
    if not client: return "Erro: API Key não configurada."
    try:
        dados = get_school_context(db)
        prompt = f"""
        És o Assistente SIGE. Responde com base nestes dados JSON exatos:
        {json.dumps(dados, ensure_ascii=False)}
        
        PERGUNTA DO UTILIZADOR: "{user_message}"
        
        REGRAS:
        1. Para "Melhores Alunos": Consulta 'ALUNOS_DESTACADOS.Quadro_Honra_Top10'.
        2. Para "Melhores Professores": Consulta 'CORPO_DOCENTE.Analise_Performance' (Ordenado por média).
        3. Para "Turmas": Consulta as listas de alunos e vê as turmas associadas.
        4. Sê detalhado: diz o nome, a média e a turma.
        """
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        return response.text
    except Exception as e:
        print(f"Erro Chat: {e}") # Log para o terminal para saberes o que falhou
        return "Lamento, ocorreu um erro técnico ao processar a resposta."