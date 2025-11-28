from datetime import date
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.db.models import (
    User, Departamento, Escalao, Professor, Staff, Turma,
    EncarregadoEducacao, Aluno, Disciplina, TurmaDisciplina,
    Nota, Financiamento, Fornecedor, Transacao, InventarioLab,
    AIRecommendation, GeneroEnum, TipoFuncionarioEnum, TipoTransacaoEnum
)
from app.core.security import get_password_hash


def populate_static():
    db = SessionLocal()

    try:
        print("🧹 A limpar e recriar tabelas...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        # ==========================================
        # 1. UTILIZADORES & DEPARTAMENTOS
        # ==========================================
        print("👤 Criando Utilizadores e Estrutura...")

        # Admin
        admin_user = User(email="admin@escola.pt", hashed_password=get_password_hash("admin123"), is_staff=True,
                          is_active=True)
        prof_user = User(email="professor@escola.pt", hashed_password=get_password_hash("prof123"), is_staff=False,
                         is_active=True)
        db.add_all([admin_user, prof_user])
        db.commit()

        # Departamentos
        dept_ciencias = Departamento(Nome="Ciências Experimentais")
        dept_artes = Departamento(Nome="Artes Visuais")
        dept_admin = Departamento(Nome="Serviços Administrativos")
        db.add_all([dept_ciencias, dept_artes, dept_admin])
        db.commit()

        # Escalões
        esc_1 = Escalao(Nome="1º Esc", Descricao="Início Carreira", Valor_Base=1500.00)
        esc_2 = Escalao(Nome="2º Esc", Descricao="Sénior", Valor_Base=2100.00)
        db.add_all([esc_1, esc_2])
        db.commit()

        # ==========================================
        # 2. STAFF E PROFESSORES
        # ==========================================
        print("👔 Criando Funcionários...")

        # Professor (Diretor de Turma)
        prof_antonio = Professor(
            Nome="António Silva",
            Data_Nasc=date(1980, 5, 20),
            Telefone="911111111",
            Morada="Rua da Escola, 1",
            Escalao_id=esc_2.Escalao_id,
            Depart_id=dept_ciencias.Depart_id
        )

        prof_maria = Professor(
            Nome="Maria Santos",
            Data_Nasc=date(1985, 3, 15),
            Telefone="922222222",
            Morada="Av. Liberdade, 20",
            Escalao_id=esc_1.Escalao_id,
            Depart_id=dept_artes.Depart_id
        )

        staff_joana = Staff(
            Nome="Joana Secretaria",
            Cargo="Secretária Chefe",
            Depart_id=dept_admin.Depart_id,
            Telefone="933333333"
        )

        db.add_all([prof_antonio, prof_maria, staff_joana])
        db.commit()

        # ==========================================
        # 3. TURMAS E ALUNOS
        # ==========================================
        print("🎓 Criando Turmas e Alunos...")

        # Turma
        turma_12a = Turma(Ano=12, Turma="A", AnoLetivo="2023/2024", DiretorT=prof_antonio.Professor_id)
        db.add(turma_12a)
        db.commit()

        # Disciplinas
        matematica = Disciplina(Nome="Matemática A", Categoria="Ciências")
        fisica = Disciplina(Nome="Física", Categoria="Ciências")
        desenho = Disciplina(Nome="Desenho A", Categoria="Artes")
        db.add_all([matematica, fisica, desenho])
        db.commit()

        # Aluno 1
        ee_carlos = EncarregadoEducacao(Nome="Carlos Costa", Telefone="966666666", Relacao="Pai")
        db.add(ee_carlos)
        db.commit()

        aluno_bruno = Aluno(
            Nome="Bruno Costa",
            Data_Nasc=date(2006, 1, 10),
            Telefone="910000001",
            Genero=GeneroEnum.M,
            Ano=12,
            Turma_id=turma_12a.Turma_id,
            Escalao="A",
            EE_id=ee_carlos.EE_id
        )
        db.add(aluno_bruno)
        db.commit()

        # Notas do Bruno
        nota_mat = Nota(
            Aluno_id=aluno_bruno.Aluno_id,
            Disc_id=matematica.Disc_id,
            Nota_1P=14, Nota_2P=15, Nota_3P=16, Nota_Final=15,
            Ano_letivo="2023/2024"
        )
        db.add(nota_mat)

        # ==========================================
        # 4. FINANÇAS (CONTABILIDADE DE FUNDOS)
        # ==========================================
        print("💰 Criando Dados Financeiros (Lógica de Fundos)...")

        # Fornecedores
        forn_fnac = Fornecedor(Nome="FNAC", NIF="123456789", Tipo="Tecnologia")
        forn_ikea = Fornecedor(Nome="IKEA", NIF="987654321", Tipo="Mobiliário")
        db.add_all([forn_fnac, forn_ikea])
        db.commit()

        # --- INVESTIMENTO 1: Laboratório de Química ---
        fin_lab = Financiamento(
            Tipo="Projeto Lab Química 2024",
            Valor=50000.00,  # Orçamento Total
            Ano=2024,
            Observacoes="Financiamento FCT para renovação"
        )
        db.add(fin_lab)
        db.commit()

        # Receita (O dinheiro entra na conta)
        t1 = Transacao(
            Tipo=TipoTransacaoEnum.Receita,
            Valor=50000.00,
            Data=date(2024, 1, 5),
            Descricao="Transferência Inicial FCT",
            Fin_id=fin_lab.Fin_id
        )
        # Despesa 1 (Compra de material)
        t2 = Transacao(
            Tipo=TipoTransacaoEnum.Despesa,
            Valor=1250.50,
            Data=date(2024, 2, 10),
            Descricao="Microscópios",
            Fin_id=fin_lab.Fin_id,
            Fornecedor_id=forn_fnac.Fornecedor_id
        )
        db.add_all([t1, t2])

        # --- INVESTIMENTO 2: Biblioteca ---
        fin_bib = Financiamento(
            Tipo="Renovação Biblioteca",
            Valor=10000.00,
            Ano=2024
        )
        db.add(fin_bib)
        db.commit()

        t3 = Transacao(
            Tipo=TipoTransacaoEnum.Receita,
            Valor=10000.00,
            Data=date(2024, 3, 1),
            Descricao="Verba CM",
            Fin_id=fin_bib.Fin_id
        )
        t4 = Transacao(
            Tipo=TipoTransacaoEnum.Despesa,
            Valor=500.00,
            Data=date(2024, 3, 15),
            Descricao="Novas Estantes",
            Fin_id=fin_bib.Fin_id,
            Fornecedor_id=forn_ikea.Fornecedor_id
        )
        db.add_all([t3, t4])

        # ==========================================
        # 5. INVENTÁRIO E IA
        # ==========================================
        item1 = InventarioLab(
            Lab_id=1, Nome_Lab="Química", Armario="A1", Nome_Item="Tubo de Ensaio", Quantidade=50, Estado="Novo"
        )
        db.add(item1)

        ai_rec = AIRecommendation(Texto="O aluno Bruno Costa melhorou 2 valores a Matemática.")
        db.add(ai_rec)

        db.commit()
        print("✅ Base de Dados populada com dados ESTÁTICOS com sucesso!")

    except Exception as e:
        print(f"❌ Erro: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    populate_static()