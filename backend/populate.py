import random
from datetime import date
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.db.models import (
    Departamento, Escalao, Professor, Staff, Turma,
    EncarregadoEducacao, Aluno, Disciplina, Nota, Financiamento, 
    Fornecedor, Transacao, GeneroEnum, TipoTransacaoEnum, AIRecommendation
)
from app.core.security import get_password_hash

# --- LISTAS AUXILIARES PARA GERAR DADOS ---
NOMES_PRIMEIROS = ["João", "Maria", "Ana", "Pedro", "Tiago", "Sofia", "Beatriz", "Tomás", "Diogo", "Mariana", "Rui", "Catarina", "Gonçalo", "Inês", "Lucas"]
NOMES_ULTIMOS = ["Silva", "Santos", "Costa", "Pereira", "Oliveira", "Martins", "Rodrigues", "Ferreira", "Almeida", "Gomes", "Pinto", "Carvalho"]
CARGOS_STAFF = ["Auxiliar de Ação Educativa", "Segurança", "Técnico Informático", "Bibliotecário", "Cozinheiro", "Secretário"]

def gerar_nome():
    return f"{random.choice(NOMES_PRIMEIROS)} {random.choice(NOMES_ULTIMOS)}"

def populate_complete():
    db = SessionLocal()

    try:
        print("🧹 A limpar base de dados...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        print("🏗️ A construir a infraestrutura da escola...")

        # 1. DEPARTAMENTOS E ESCALÕES
        deps = [
            Departamento(Nome="Ciências e Tecnologias"),
            Departamento(Nome="Línguas e Humanidades"),
            Departamento(Nome="Artes Visuais"),
            Departamento(Nome="Administração Escolar")
        ]
        db.add_all(deps)
        db.commit()

        escaloes = [
            Escalao(Nome="1º Esc", Valor_Base=1500.00),
            Escalao(Nome="2º Esc", Valor_Base=1800.00),
            Escalao(Nome="3º Esc", Valor_Base=2200.00)
        ]
        db.add_all(escaloes)
        db.commit()

        # 2. STAFF (15 PESSOAS)
        print("👔 A contratar 15 funcionários...")
        
        # Admin Principal
        admin = Staff(
            Nome="Super Admin",
            email="admin@escola.pt",
            hashed_password=get_password_hash("pass123"), # CORRIGIDO PARA pass123
            role="admin",
            Cargo="Diretor",
            Depart_id=deps[3].Depart_id,
            Telefone="910000000"
        )
        db.add(admin)

        # Professores (8 Professores)
        professores_objs = []
        for i in range(8):
            p = Professor(
                Nome=gerar_nome(),
                email=f"prof{i}@escola.pt",
                hashed_password=get_password_hash("prof123"),
                role="professor",
                Data_Nasc=date(1980 + i, 1, 1),
                Telefone=f"96000000{i}",
                Escalao_id=random.choice(escaloes).Escalao_id,
                Depart_id=random.choice(deps[:3]).Depart_id # Apenas dept pedagógicos
            )
            professores_objs.append(p)
        db.add_all(professores_objs)
        db.commit()

        # Staff de Apoio (6 Staffs)
        for i in range(6):
            s = Staff(
                Nome=gerar_nome(),
                email=f"staff{i}@escola.pt",
                hashed_password=get_password_hash("staff123"),
                role="staff",
                Cargo=random.choice(CARGOS_STAFF),
                Depart_id=deps[3].Depart_id, # Dept Admin
                Telefone=f"93000000{i}"
            )
            db.add(s)
        db.commit()

        # 3. TURMAS E DISCIPLINAS
        print("📚 A criar Turmas e Disciplinas...")
        
        disciplinas = [
            Disciplina(Nome="Matemática A", Categoria="Ciências"),
            Disciplina(Nome="Física e Química", Categoria="Ciências"),
            Disciplina(Nome="Português", Categoria="Línguas"),
            Disciplina(Nome="Inglês", Categoria="Línguas"),
            Disciplina(Nome="Geometria Descritiva", Categoria="Artes"),
            Disciplina(Nome="História A", Categoria="Humanidades")
        ]
        db.add_all(disciplinas)
        db.commit()

        turmas = []
        # Criar turmas do 10º, 11º e 12º
        diretor_idx = 0
        for ano in [10, 11, 12]:
            for letra in ["A", "B"]:
                # Atribuir um diretor de turma rotativo
                diretor = professores_objs[diretor_idx % len(professores_objs)]
                t = Turma(Ano=ano, Turma=letra, AnoLetivo="2024/2025", DiretorT=diretor.Professor_id)
                turmas.append(t)
                diretor_idx += 1
        db.add_all(turmas)
        db.commit()

        # 4. ALUNOS (100 ALUNOS)
        print("🎓 A matricular 100 alunos e lançar notas...")
        
        # Encarregado de educação genérico (para simplificar)
        ee = EncarregadoEducacao(Nome="EE Genérico", Telefone="912345678")
        db.add(ee)
        db.commit()

        for i in range(100):
            turma_aluno = random.choice(turmas)
            escalao_aluno = random.choice(["A", "B", "C", None]) # Alguns com ASE
            
            aluno = Aluno(
                Nome=gerar_nome(),
                Data_Nasc=date(2007, 1, 1),
                Genero=random.choice([GeneroEnum.M, GeneroEnum.F]),
                Ano=turma_aluno.Ano,
                Turma_id=turma_aluno.Turma_id,
                Escalao=escalao_aluno,
                EE_id=ee.EE_id,
                Telefone=f"920000{i:03d}"
            )
            db.add(aluno)
            db.commit() # Commit para ter ID

            # Lançar Notas (Simular Alunos Bons, Médios e Maus)
            # 15% Maus, 60% Médios, 25% Bons
            perfil = random.choices(["mau", "medio", "bom"], weights=[15, 60, 25])[0]
            
            notas_aluno = []
            for disc in random.sample(disciplinas, 3): # 3 disciplinas por aluno
                if perfil == "mau":
                    nota_final = random.randint(5, 9) # Negativa
                elif perfil == "medio":
                    nota_final = random.randint(10, 14)
                else:
                    nota_final = random.randint(15, 20)
                
                n = Nota(
                    Aluno_id=aluno.Aluno_id,
                    Disc_id=disc.Disc_id,
                    Nota_Final=nota_final,
                    Ano_letivo="2024/2025"
                )
                notas_aluno.append(n)
            
            db.add_all(notas_aluno)

        # 5. CASO ESPECIAL: O ALUNO EM RISCO (Para a AI detetar de certeza)
        aluno_risco = Aluno(
            Nome="Tiago Problemático", 
            Data_Nasc=date(2008, 5, 20), Genero=GeneroEnum.M, Ano=12, Turma_id=turmas[0].Turma_id, EE_id=ee.EE_id
        )
        db.add(aluno_risco)
        db.commit()
        # Notas muito negativas
        db.add(Nota(Aluno_id=aluno_risco.Aluno_id, Disc_id=disciplinas[0].Disc_id, Nota_Final=4, Ano_letivo="2024/2025"))
        db.add(Nota(Aluno_id=aluno_risco.Aluno_id, Disc_id=disciplinas[1].Disc_id, Nota_Final=6, Ano_letivo="2024/2025"))

        # 6. FINANÇAS (CENÁRIO MISTO)
        print("💰 A criar movimentos financeiros...")
        
        # Fornecedores
        f1 = Fornecedor(Nome="Papelaria Central", NIF="111111111")
        f2 = Fornecedor(Nome="Eletro Escola", NIF="222222222")
        db.add_all([f1, f2])
        db.commit()

        # Financiamento 1: Saudável
        fin_papel = Financiamento(Tipo="Material Escritório", Valor=5000.00, Ano=2025)
        db.add(fin_papel)
        db.commit()
        
        db.add(Transacao(Tipo=TipoTransacaoEnum.Receita, Valor=5000.00, Data=date(2025, 1, 10), Fin_id=fin_papel.Fin_id))
        db.add(Transacao(Tipo=TipoTransacaoEnum.Despesa, Valor=200.00, Data=date(2025, 2, 10), Descricao="Resmas Papel", Fin_id=fin_papel.Fin_id, Fornecedor_id=f1.Fornecedor_id))

        # Financiamento 2: CRÍTICO (Para a AI detetar)
        fin_lab = Financiamento(Tipo="Projeto Robótica", Valor=10000.00, Ano=2025)
        db.add(fin_lab)
        db.commit()
        
        db.add(Transacao(Tipo=TipoTransacaoEnum.Receita, Valor=10000.00, Data=date(2025, 1, 15), Fin_id=fin_lab.Fin_id))
        # Despesa massiva
        db.add(Transacao(
            Tipo=TipoTransacaoEnum.Despesa, 
            Valor=9500.00, 
            Data=date(2025, 3, 20), 
            Descricao="Compra Equipamento Não Autorizado", 
            Fin_id=fin_lab.Fin_id,
            Fornecedor_id=f2.Fornecedor_id
        ))

        # 7. AI RECOMMENDATIONS (Dados Iniciais)
        print("🤖 A inicializar módulo AI...")
        rec = AIRecommendation(Texto="O sistema de IA foi inicializado e aguarda a primeira análise completa.")
        db.add(rec)

        db.commit()
        print("✅ POPULAÇÃO CONCLUÍDA: 100 Alunos, 15 Staff, Cenários Criados.")

    except Exception as e:
        print(f"❌ Erro crítico: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_complete()