from app.db.database import SessionLocal
from app.db.models import Aluno, Professor, Transacao, Financiamento, User


def check_data():
    db = SessionLocal()

    print("--- 📊 Relatório de Verificação ---")

    # 1. Verificar Users
    n_users = db.query(User).count()
    print(f"✅ Utilizadores: {n_users} (Login: admin@escola.pt / admin123)")

    # 2. Verificar Alunos
    n_alunos = db.query(Aluno).count()
    print(f"✅ Alunos criados: {n_alunos}")

    # 3. Verificar Professores
    n_profs = db.query(Professor).count()
    print(f"✅ Professores criados: {n_profs}")

    # 4. Verificar Finanças (A regra dos fundos)
    print("\n💰 Verificação de Investimentos:")
    investimentos = db.query(Financiamento).all()
    for inv in investimentos:
        # Calcular saldo manualmente para ver se bate certo
        total_gasto = 0
        transacoes = db.query(Transacao).filter(Transacao.Fin_id == inv.Fin_id).all()
        for t in transacoes:
            if t.Tipo.value == 'Despesa':
                total_gasto += t.Valor

        saldo = inv.Valor - total_gasto
        print(f"   - {inv.Tipo}: Orçamento {inv.Valor}€ | Gasto: {total_gasto:.2f}€ | Saldo: {saldo:.2f}€")

    db.close()


if __name__ == "__main__":
    check_data()