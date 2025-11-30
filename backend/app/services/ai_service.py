import os
import json
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import models
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurar cliente Gemini
# Se não houver chave configurada, o cliente não inicia (evita erros se esqueceres do .env)
api_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def get_school_context(db: Session):
    """
    Coletor de Contexto: Transforma dados SQL em Texto para a AI.
    Adaptado para a estrutura REAL do models.py (sem campo Faltas).
    """
    
    # 1. Dados Financeiros (Soma do ano atual)
    # Assumimos que a tabela Transacoes tem dados. Se não tiver, envia zeros.
    transacoes = db.query(
        models.Transacao.Tipo,
        func.sum(models.Transacao.Valor)
    ).group_by(models.Transacao.Tipo).all()
    
    financas = {t[0]: float(t[1] or 0) for t in transacoes}

    # 2. Dados Pedagógicos (ADAPTADO: Usar Notas Negativas em vez de Faltas)
    # Procurar alunos que tenham pelo menos uma Nota Final abaixo de 10
    alunos_risco_query = (
        db.query(models.Aluno)
        .join(models.Nota)
        .filter(models.Nota.Nota_Final < 10)
        .distinct()
        .limit(6) # Limitamos a 6 para não encher o prompt
        .all()
    )
    
    lista_risco = []
    for aluno in alunos_risco_query:
        # Nome da turma
        turma_desc = "Sem Turma"
        if aluno.turma_obj:
            turma_desc = f"{aluno.turma_obj.Ano}º {aluno.turma_obj.Turma}"

        # Descobrir a que disciplinas tem negativa
        # Filtramos na lista de notas do aluno as que são negativas
        disciplinas_negativas = []
        for nota in aluno.notas:
            if nota.Nota_Final is not None and nota.Nota_Final < 10:
                # Se tivermos acesso ao nome da disciplina, ótimo. 
                # Se não, usamos o ID ou tentamos aceder ao objeto disciplina se carregado.
                nome_disc = nota.disciplina.Nome if nota.disciplina else f"Disc #{nota.Disc_id}"
                disciplinas_negativas.append(f"{nome_disc} ({nota.Nota_Final})")

        lista_risco.append({
            "nome": aluno.Nome,
            "turma": turma_desc,
            "problema": "Insucesso Escolar",
            "detalhes": f"Negativas em: {', '.join(disciplinas_negativas)}"
        })

    # 3. Staff (Contagem simples)
    total_staff = db.query(models.Staff).count()
    total_alunos = db.query(models.Aluno).count()

    return {
        "resumo_financeiro": financas,
        "alunos_em_risco_academico": lista_risco,
        "estatisticas_gerais": {
            "total_staff": total_staff,
            "total_alunos": total_alunos
        }
    }

def generate_insights(db: Session):
    """
    Função principal que chama o Gemini.
    """
    if not client:
        return [{
            "id": 999,
            "titulo": "Configuração em Falta",
            "descricao": "A API Key do Google não foi encontrada no ficheiro .env",
            "area": "Sistema",
            "prioridade": "Alta",
            "acao_sugerida": "Adicionar GOOGLE_API_KEY ao .env"
        }]

    # 1. Obter dados reais
    try:
        contexto = get_school_context(db)
    except Exception as e:
        print(f"Erro ao ler base de dados: {e}")
        return [{
            "id": 998,
            "titulo": "Erro de Dados",
            "descricao": "Não foi possível ler os dados da escola. Verifica se a BD está populada.",
            "area": "Sistema",
            "prioridade": "Alta",
            "acao_sugerida": "Verificar logs do backend."
        }]

    # 2. Preparar o Prompt
    prompt = f"""
    Atua como um Consultor de Gestão Escolar Sénior.
    Analisa os seguintes dados REAIS da nossa escola (em JSON):
    {json.dumps(contexto, ensure_ascii=False)}

    OBJETIVO:
    Identifica até 4 pontos críticos e sugere ações.
    Se a lista de alunos em risco estiver vazia, foca-te na parte financeira ou elogia o sucesso escolar.
    
    REGRAS OBRIGATÓRIAS:
    1. Responde APENAS com um JSON válido.
    2. O JSON deve ser uma LISTA de objetos com esta estrutura exata:
       [
         {{
           "id": 1, 
           "titulo": "Titulo curto",
           "descricao": "Análise do problema (máx 2 frases)",
           "area": "Financeira" | "Pedagógica" | "Staff" | "Geral",
           "prioridade": "Alta" | "Média" | "Baixa",
           "acao_sugerida": "Ação concreta"
         }}
       ]
    """

    try:
        # 3. Chamada à API
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        return json.loads(response.text)

    except Exception as e:
        print(f"Erro na AI: {e}")
        return [{
            "id": 997,
            "titulo": "Erro na IA",
            "descricao": "O consultor virtual não conseguiu processar o pedido.",
            "area": "Sistema",
            "prioridade": "Média",
            "acao_sugerida": "Tentar novamente mais tarde."
        }]