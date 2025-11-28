from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_

from app.db.database import get_db
from app.db.models import Financiamento, Transacao, TipoTransacaoEnum
from app.db import schemas

router = APIRouter()


def calcular_investimento_individual(db: Session, investimento: Financiamento, ano: int, mes: Optional[int] = None):
    """
    Função auxiliar que calcula a matemática de um único investimento (Lab, Projeto, etc).
    """
    # 1. Calcular tudo o que já foi gasto deste investimento DESDE O INÍCIO (Acumulado)
    # Isso garante a regra: "mesmo que sobre o resto no futuro continua a ser so usado no lab"
    query_acumulado = db.query(
        func.sum(Transacao.Valor)
    ).filter(
        Transacao.Fin_id == investimento.Fin_id,
        Transacao.Tipo == TipoTransacaoEnum.Despesa
    )
    gasto_acumulado = query_acumulado.scalar() or 0.0

    # O saldo real é o valor inicial do financiamento MENOS tudo o que já se gastou dele até hoje
    saldo_restante = float(investimento.Valor) - gasto_acumulado

    # 2. Calcular movimentos do PERÍODO solicitado (Mês/Ano) para o relatório
    query_periodo = db.query(
        Transacao.Tipo,
        func.sum(Transacao.Valor)
    ).filter(
        Transacao.Fin_id == investimento.Fin_id,
        extract('year', Transacao.Data) == ano
    )

    if mes:
        query_periodo = query_periodo.filter(extract('month', Transacao.Data) == mes)

    resultados_periodo = query_periodo.group_by(Transacao.Tipo).all()

    receita_periodo = 0.0
    despesa_periodo = 0.0

    for tipo, valor in resultados_periodo:
        if tipo == TipoTransacaoEnum.Receita:
            receita_periodo = valor
        elif tipo == TipoTransacaoEnum.Despesa:
            despesa_periodo = valor

    return schemas.BalancoInvestimento(
        id=investimento.Fin_id,
        tipo_investimento=investimento.Tipo or "Sem Nome",
        ano_financiamento=investimento.Ano or 0,
        valor_aprovado=float(investimento.Valor or 0.0),
        total_receita_periodo=float(receita_periodo),
        total_despesa_periodo=float(despesa_periodo),
        total_gasto_acumulado=float(gasto_acumulado),
        saldo_restante=float(saldo_restante)
    )


@router.get("/balanco/mensal", response_model=schemas.BalancoGeral)
def balanco_mensal(
        ano: int,
        mes: int = Query(..., ge=1, le=12),
        db: Session = Depends(get_db)
):
    """
    Retorna o balanço de um mês específico, detalhando cada investimento (Lab, Projeto, etc).
    """
    # 1. Balanço Geral (Sem olhar a investimentos específicos, fluxo de caixa da escola)
    qry_geral = db.query(
        Transacao.Tipo,
        func.sum(Transacao.Valor)
    ).filter(
        extract('year', Transacao.Data) == ano,
        extract('month', Transacao.Data) == mes
    ).group_by(Transacao.Tipo).all()

    tot_rec = sum(v for t, v in qry_geral if t == TipoTransacaoEnum.Receita)
    tot_desp = sum(v for t, v in qry_geral if t == TipoTransacaoEnum.Despesa)

    # 2. Balanço Detalhado por Investimento (Regra da Escola Pública)
    investimentos = db.query(Financiamento).all()
    lista_detalhada = []

    for inv in investimentos:
        dados_inv = calcular_investimento_individual(db, inv, ano, mes)
        lista_detalhada.append(dados_inv)

    return {
        "periodo": f"{ano}-{mes:02d}",
        "total_receita": float(tot_rec or 0),
        "total_despesa": float(tot_desp or 0),
        "saldo": float((tot_rec or 0) - (tot_desp or 0)),
        "detalhe_investimentos": lista_detalhada
    }


@router.get("/balanco/anual", response_model=schemas.BalancoGeral)
def balanco_anual(ano: int, db: Session = Depends(get_db)):
    """
    Retorna o balanço anual acumulado.
    """
    # 1. Balanço Geral do Ano
    qry_geral = db.query(
        Transacao.Tipo,
        func.sum(Transacao.Valor)
    ).filter(
        extract('year', Transacao.Data) == ano
    ).group_by(Transacao.Tipo).all()

    tot_rec = sum(v for t, v in qry_geral if t == TipoTransacaoEnum.Receita)
    tot_desp = sum(v for t, v in qry_geral if t == TipoTransacaoEnum.Despesa)

    # 2. Detalhe por Investimento
    investimentos = db.query(Financiamento).all()
    lista_detalhada = []

    for inv in investimentos:
        # Nota: Passamos mes=None para calcular o ano todo
        dados_inv = calcular_investimento_individual(db, inv, ano, mes=None)
        lista_detalhada.append(dados_inv)

    return {
        "periodo": str(ano),
        "total_receita": float(tot_rec or 0),
        "total_despesa": float(tot_desp or 0),
        "saldo": float((tot_rec or 0) - (tot_desp or 0)),
        "detalhe_investimentos": lista_detalhada
    }