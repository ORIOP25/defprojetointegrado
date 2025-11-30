import os
import json
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from app.db import models
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def get_school_context(db: Session):
    """
    Coleta dados e pré-processa listas para poupar trabalho à IA.
    """
    contexto = {}

    # 1. PEDAGÓGICO
    notas_query = (
        db.query(models.Nota, models.Aluno, models.Disciplina, models.Turma)
        .join(models.Aluno, models.Nota.Aluno_id == models.Aluno.Aluno_id)
        .join(models.Disciplina, models.Nota.Disc_id == models.Disciplina.Disc_id)
        .join(models.Turma, models.Aluno.Turma_id == models.Turma.Turma_id)
        .all()
    )

    lista_risco = []
    lista_sucesso = []

    for nota, aluno, disc, turma in notas_query:
        if nota.Nota_Final is None: continue
        
        dados = {
            "Aluno": aluno.Nome,
            "Turma": f"{turma.Ano}º{turma.Turma}",
            "Disciplina": disc.Nome,
            "Nota": nota.Nota_Final
        }

        if nota.Nota_Final < 10:
            lista_risco.append(dados)
        elif nota.Nota_Final >= 18: # Subi a fasquia para 18 para reduzir volume
            lista_sucesso.append(dados)

    # Ordenar por gravidade
    lista_risco.sort(key=lambda x: x["Nota"])
    
    contexto["pedagogico"] = {
        "negativas": lista_risco, # Envia a lista completa
        "quadro_honra": lista_sucesso
    }

    # 2. FINANCEIRO
    transacoes = db.query(models.Transacao).order_by(models.Transacao.Valor.desc()).limit(15).all()
    lista_trans = []
    for t in transacoes:
        lista_trans.append({
            "Data": str(t.Data),
            "Tipo": t.Tipo,
            "Valor": f"{float(t.Valor)}€",
            "Descrição": t.Descricao
        })
    
    contexto["financeiro"] = lista_trans

    return contexto

def generate_insights(db: Session):
    if not client: return []

    try:
        dados = get_school_context(db)
        
        # OTIMIZAÇÃO: Pedimos à IA para analisar, mas INJETAMOS os detalhes nós mesmos se necessário,
        # ou deixamos a IA escolher apenas os top 5 exemplos para o texto, mas a tabela completa vai nos dados.
        
        prompt = f"""
        Tu és o Analista de Dados do SIGE.
        Analisa os dados JSON abaixo.

        DADOS ESCOLARES:
        {json.dumps(dados, ensure_ascii=False)}

        TAREFA:
        Gera um relatório JSON estruturado.
        
        ESTRUTURA DE RESPOSTA (Obrigatória):
        [
          {{
            "categoria": "Nome da Categoria",
            "cor": "blue/green/red",
            "insights": [
              {{
                "tipo": "negativo/positivo",
                "titulo": "Titulo curto",
                "descricao": "Resumo do problema. Menciona quantidades (ex: '15 alunos').",
                "sugestao": "Ação concreta.",
                "detalhes": []  <-- IMPORTANTE: Copia para aqui os dados relevantes do JSON original que justificam este insight.
              }}
            ]
          }}
        ]

        REGRAS:
        1. Cria categorias lógicas (Pedagógico, Financeiro).
        2. Se houver muitos alunos (mais de 20), agrupa por disciplina ou turma nos "detalhes".
        3. Deteta anomalias financeiras.
        """

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        return json.loads(response.text)

    except Exception as e:
        print(f"Erro AI: {e}")
        # Fallback elegante
        return []