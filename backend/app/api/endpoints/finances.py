from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from datetime import date

from app.db.database import get_db
from app.db.models import Financiamento, Transacao, TipoTransacaoEnum
from app.db import schemas


router = APIRouter()

# --- FUNÇÕES AUXILIARES ---

def calcular_investimento_individual(db: Session, investimento: Financiamento, ano: int, mes: Optional[int] = None):
    """
    Calcula a matemática de um único investimento (Lab, Projeto, etc), convertendo decimais para float.
    """
    # 1. Calcular gastos acumulados desde sempre para este centro de custo
    query_acumulado = db.query(
        func.sum(Transacao.Valor)
    ).filter(
        Transacao.Fin_id == investimento.Fin_id,
        Transacao.Tipo == TipoTransacaoEnum.Despesa
    )
    gasto_acumulado = query_acumulado.scalar() or 0.0

    valor_inicial = float(investimento.Valor or 0.0)
    gasto_total = float(gasto_acumulado)
    saldo_restante = valor_inicial - gasto_total

    # 2. Calcular movimentos específicos do período solicitado
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
            receita_periodo = float(valor)
        elif tipo == TipoTransacaoEnum.Despesa:
            despesa_periodo = float(valor)

    return schemas.BalancoInvestimento(
        id=investimento.Fin_id,
        tipo_investimento=investimento.Tipo or "Sem Nome",
        ano_financiamento=investimento.Ano or 0,
        valor_aprovado=valor_inicial,
        total_receita_periodo=receita_periodo,
        total_despesa_periodo=despesa_periodo,
        total_gasto_acumulado=gasto_total,
        saldo_restante=saldo_restante
    )

# --- ROTAS DE BALANÇO ---

@router.get("/balanco/mensal", response_model=schemas.BalancoGeral)
def balanco_mensal(ano: int, mes: int = Query(..., ge=1, le=12), db: Session = Depends(get_db)):
    """Retorna o balanço de um mês específico."""
    qry_geral = db.query(
        Transacao.Tipo, func.sum(Transacao.Valor)
    ).filter(
        extract('year', Transacao.Data) == ano,
        extract('month', Transacao.Data) == mes
    ).group_by(Transacao.Tipo).all()

    tot_rec = sum(float(v) for t, v in qry_geral if t == TipoTransacaoEnum.Receita)
    tot_desp = sum(float(v) for t, v in qry_geral if t == TipoTransacaoEnum.Despesa)

    investimentos = db.query(Financiamento).all()
    lista_detalhada = [calcular_investimento_individual(db, inv, ano, mes) for inv in investimentos]

    return {
        "periodo": f"{ano}-{mes:02d}",
        "total_receita": tot_rec,
        "total_despesa": tot_desp,
        "saldo": tot_rec - tot_desp,
        "detalhe_investimentos": lista_detalhada
    }

@router.get("/balanco/anual", response_model=schemas.BalancoGeral)
def balanco_anual(ano: int, db: Session = Depends(get_db)):
    """Retorna o balanço anual acumulado."""
    qry_geral = db.query(
        Transacao.Tipo, func.sum(Transacao.Valor)
    ).filter(extract('year', Transacao.Data) == ano).group_by(Transacao.Tipo).all()

    tot_rec = sum(float(v) for t, v in qry_geral if t == TipoTransacaoEnum.Receita)
    tot_desp = sum(float(v) for t, v in qry_geral if t == TipoTransacaoEnum.Despesa)

    investimentos = db.query(Financiamento).all()
    lista_detalhada = [calcular_investimento_individual(db, inv, ano, None) for inv in investimentos]

    return {
        "periodo": str(ano),
        "total_receita": tot_rec,
        "total_despesa": tot_desp,
        "saldo": tot_rec - tot_desp,
        "detalhe_investimentos": lista_detalhada
    }

# --- CRUD DE INVESTIMENTOS (FINANCIAMENTOS) ---

@router.get("/investimentos", response_model=List[schemas.FinanciamentoDisplay])
def listar_investimentos(db: Session = Depends(get_db)):
    """Lista todos os centros de custo/investimentos."""
    return db.query(Financiamento).all()

@router.post("/investimentos", response_model=schemas.FinanciamentoDisplay)
def criar_investimento(inv: schemas.FinanciamentoCreate, db: Session = Depends(get_db)):
    """Regista um novo financiamento (ex: Orçamento de Estado, Verba Lab)."""
    novo = Financiamento(Tipo=inv.Tipo, Valor=inv.Valor, Ano=inv.Ano, Observacoes=inv.Observacoes)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

# --- CRUD DE DESPESAS (TRANSAÇÕES) ---

@router.get("/despesas", response_model=List[schemas.DespesaHistorico])
def listar_despesas(db: Session = Depends(get_db)):
    """Lista todas as transações marcadas como Despesa."""
    despesas = db.query(Transacao).filter(Transacao.Tipo == TipoTransacaoEnum.Despesa).order_by(Transacao.Data.desc()).all()
    
    return [
        schemas.DespesaHistorico(
            id=d.Transacao_id,
            descricao=d.Descricao or "Sem descrição",
            valor=float(d.Valor),
            investimento_id=d.Fin_id,
            investimento_nome=d.financiamento.Tipo if d.financiamento else "Geral"
        ) for d in despesas
    ]

@router.post("/despesas", response_model=schemas.DespesaHistorico)
def criar_despesa(desp: schemas.DespesaCreate, db: Session = Depends(get_db)):
    """Cria uma nova despesa vinculada a um investimento."""
    nova = Transacao(
        Tipo=TipoTransacaoEnum.Despesa,
        Valor=desp.valor,
        Descricao=desp.descricao,
        Fin_id=desp.investimento_id,
        Data=date.today()
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    
    return schemas.DespesaHistorico(
        id=nova.Transacao_id,
        descricao=nova.Descricao,
        valor=float(nova.Valor),
        investimento_id=nova.Fin_id,
        investimento_nome=nova.financiamento.Tipo if nova.financiamento else "Geral"
    )

@router.delete("/despesas/{id}")
def eliminar_despesa(id: int, db: Session = Depends(get_db)):
    """Remove uma despesa e atualiza o saldo do investimento."""
    desp = db.query(Transacao).filter(Transacao.Transacao_id == id).first()
    if not desp:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    db.delete(desp)
    db.commit()
    return {"message": "Despesa eliminada com sucesso"}