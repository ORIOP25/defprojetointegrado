from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.db import models

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Contar Alunos
    total_students = db.query(models.Aluno).count()

    # 2. Contar Staff (excluindo professores se quiseres, ou tudo)
    total_staff = db.query(models.Staff).count()
    total_teachers = db.query(models.Professor).count()

    # 3. Calcular Saldo Financeiro (Receitas - Despesas)
    # Soma de todas as receitas
    total_revenue = db.query(func.sum(models.Transacao.Valor))\
        .filter(models.Transacao.Tipo == models.TipoTransacaoEnum.Receita).scalar() or 0
    
    # Soma de todas as despesas
    total_expenses = db.query(func.sum(models.Transacao.Valor))\
        .filter(models.Transacao.Tipo == models.TipoTransacaoEnum.Despesa).scalar() or 0

    current_balance = total_revenue - total_expenses

    return {
        "total_students": total_students,
        "total_staff": total_staff + total_teachers, # Juntamos staff e professores
        "financial_balance": float(current_balance),
        "monthly_revenue": float(total_revenue) # Simplificado para o exemplo
    }