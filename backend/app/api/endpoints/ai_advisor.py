from typing import List
from fastapi import APIRouter
from app.db import schemas
import random

router = APIRouter()

@router.get("/insights", response_model=List[schemas.RecomendacaoIA])
def get_ai_recommendations():
    """
    Simula uma análise de IA sobre os dados da escola.
    Futuramente: Aqui ligaremos o Google Gemini para ler a BD e gerar texto.
    """
    
    # Simulação de análise inteligente (Mock Data)
    # Quando tiveres a API Key do Gemini, substituímos isto pela chamada real.
    insights = [
        {
            "id": 1,
            "titulo": "Desvio Orçamental Detectado",
            "descricao": "O departamento de Ciências gastou 15% acima do previsto este mês devido à compra de reagentes não planeados.",
            "area": "Financeira",
            "prioridade": "Alta",
            "acao_sugerida": "Rever orçamento de consumíveis para o Q2."
        },
        {
            "id": 2,
            "titulo": "Risco de Abandono Escolar",
            "descricao": "3 Alunos da turma 10ºB apresentam mais de 15 faltas injustificadas consecutivas.",
            "area": "Pedagógica",
            "prioridade": "Alta",
            "acao_sugerida": "Agendar reunião com Encarregados de Educação."
        },
        {
            "id": 3,
            "titulo": "Otimização de Staff",
            "descricao": "Existe uma sobreposição de horários entre 2 auxiliares no bloco C durante a manhã, enquanto o bloco A está descoberto.",
            "area": "Staff",
            "prioridade": "Média",
            "acao_sugerida": "Ajustar escala de turnos da Manhã."
        },
        {
            "id": 4,
            "titulo": "Manutenção Preventiva",
            "descricao": "Os projetores das salas 5 e 6 estão a atingir o limite de horas de lâmpada previsto.",
            "area": "Infraestrutura",
            "prioridade": "Baixa",
            "acao_sugerida": "Encomendar lâmpadas de substituição."
        }
    ]

    return insights