import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.db.models import (
    Departamento, Escalao, Professor, Staff, Turma,
    EncarregadoEducacao, Aluno, Disciplina, Nota, Financiamento, 
    Fornecedor, Transacao, GeneroEnum, TipoTransacaoEnum, AIRecommendation,
    TurmaDisciplina, Falta, Ocorrencia, TipoOcorrenciaEnum
)
from app.core.security import get_password_hash

# --- DADOS SEED ---
NOMES_MASCULINOS = ["João", "Pedro", "Tiago", "Lucas", "Mateus", "Duarte", "Tomás", "Gonçalo", "Rodrigo", "Francisco", "Martim", "Santiago", "Afonso"]
NOMES_FEMININOS = ["Maria", "Ana", "Sofia", "Beatriz", "Leonor", "Matilde", "Carolina", "Mariana", "Inês", "Lara", "Alice", "Francisca", "Clara"]
APELIDOS = ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Gomes", "Lopes", "Marques", "Almeida", "Ribeiro"]
DEPARTAMENTOS = ["Ciências Exatas", "Línguas", "Artes", "Ciências Sociais", "Serviços Admin"]
CARGOS_STAFF = ["Secretário", "Assistente Operacional", "Técnico Informática", "Psicólogo", "Segurança"]

DISCIPLINAS_CONFIG = [
    {"nome": "Matemática A", "cat": "Ciências", "dept_idx": 0},
    {"nome": "Física e Química A", "cat": "Ciências", "dept_idx": 0},
    {"nome": "Português", "cat": "Línguas", "dept_idx": 1},
    {"nome": "Inglês", "cat": "Línguas", "dept_idx": 1},
    {"nome": "História A", "cat": "Humanidades", "dept_idx": 3},
    {"nome": "Oficina de Artes", "cat": "Artes", "dept_idx": 2},
    {"nome": "Educação Física", "cat": "Desporto", "dept_idx": 4} # Dept 4 é placeholder
]

COMENTARIOS_MAU_COMPORTAMENTO = [
    "Perturbou a aula constantemente.", "Recusou-se a trabalhar.", "Uso indevido do telemóvel.", 
    "Chegou atrasado e fez barulho.", "Faltou ao respeito ao professor."
]
COMENTARIOS_GRAVES = [
    "Agressão verbal a um colega.", "Danos materiais na sala de aula.", "Suspeita de vandalismo."
]

def gerar_nome(genero=None):
    if genero == "M": primeiro = random.choice(NOMES_MASCULINOS)
    elif genero == "F": primeiro = random.choice(NOMES_FEMININOS)
    else: primeiro = random.choice(NOMES_MASCULINOS + NOMES_FEMININOS)
    return f"{primeiro} {random.choice(APELIDOS)} {random.choice(APELIDOS)}"

def populate_advanced():
    db = SessionLocal()
    try:
        print("🧹 Limpar DB...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        # 1. DEPARTAMENTOS & ESCALÕES
        print("🏗️ Estrutura Base...")
        dept_objs = [Departamento(Nome=d) for d in DEPARTAMENTOS]
        db.add_all(dept_objs)
        db.commit()

        # Escalões com grande disparidade para a IA analisar Custo vs Benefício
        esc_objs = []
        vals = [1200, 1600, 2100, 2800] # Salários progressivos
        for i, val in enumerate(vals, 1):
            esc = Escalao(Nome=f"{i}º Esc", Valor_Base=val, Descricao=f"Nível {i}")
            db.add(esc)
            esc_objs.append(esc)
        db.commit()

        # 2. STAFF & PROFESSORES
        print("👔 Recursos Humanos...")
        admin = Staff(Nome="Admin", email="admin@escola.pt", hashed_password=get_password_hash("pass"), role="admin", Depart_id=dept_objs[4].Depart_id)
        db.add(admin)

        professores = []
        # Criar "Personagens" Docentes para a IA detetar
        # Prof 0: O "Caro e Mau" (Escalão alto, mas alunos com más notas)
        # Prof 1: O "Barato e Bom" (Estagiário, alunos com ótimas notas)
        for i in range(15):
            escalao_idx = 3 if i == 0 else (0 if i == 1 else random.randint(0, 3))
            dept_idx = i % 4
            
            p = Professor(
                Nome=gerar_nome(),
                email=f"prof{i+1}@escola.pt", 
                hashed_password=get_password_hash("123"),
                Data_Nasc=date(1970 + i, 1, 1),
                Escalao_id=esc_objs[escalao_idx].Escalao_id,
                Depart_id=dept_objs[dept_idx].Depart_id
            )
            professores.append(p)
        db.add_all(professores)
        db.commit()

        # Staff Não Docente (Secretaria, Técnicos, etc.)
        for i in range(8):
            s = Staff(
                Nome=gerar_nome(),
                email=f"staff{i+1}@escola.pt",
                hashed_password=get_password_hash("staff123"),
                role="staff",
                Cargo=random.choice(CARGOS_STAFF),
                Depart_id=dept_objs[4].Depart_id, # Dept 4 = Serviços Administrativos
                Telefone=f"9300000{i:02d}"
            )
            db.add(s)
        db.commit()

        # 3. TURMAS E DISCIPLINAS
        print("📚 Académico...")
        disciplinas = [Disciplina(Nome=d["nome"], Categoria=d["cat"]) for d in DISCIPLINAS_CONFIG]
        db.add_all(disciplinas)
        db.commit()

        turmas = []
        for ano, letra in [(10,"A"), (10,"B"), (11,"A"), (11,"B"), (12,"A")]:
            t = Turma(Ano=ano, Turma=letra, AnoLetivo="2024/2025", DiretorT=professores[random.randint(0,14)].Professor_id)
            turmas.append(t)
        db.add_all(turmas)
        db.commit()

        # Atribuição de Disciplinas (Garantir que o Prof "Caro e Mau" tem turmas)
        mapa_turma_disciplina = {} # Para saber quem dá aulas a quem
        for turma in turmas:
            disciplinas_escolhidas = disciplinas[:5] # Simplificação: todos têm as primeiras 5
            for disc in disciplinas_escolhidas:
                # Se for Matemática (idx 0), forçar o Prof 0 (Caro/Mau) na Turma 10A para criar o cenário
                if disc.Nome == "Matemática A" and turma.Ano == 10 and turma.Turma == "A":
                    prof = professores[0] 
                elif disc.Nome == "Matemática A" and turma.Ano == 10 and turma.Turma == "B":
                    prof = professores[1] # O Prof Bom e Barato
                else:
                    prof = random.choice(professores)
                
                td = TurmaDisciplina(Turma_id=turma.Turma_id, Disc_id=disc.Disc_id, Professor_id=prof.Professor_id)
                db.add(td)
                mapa_turma_disciplina[(turma.Turma_id, disc.Disc_id)] = prof.Professor_id
        db.commit()

        # 4. ALUNOS, NOTAS E COMPORTAMENTO (CORRELACIONADOS)
        print("🎓 Alunos e Histórico Comportamental...")
        ee = EncarregadoEducacao(Nome="EE Geral", Telefone="999999999")
        db.add(ee)
        db.commit()

        perfis = ["excelencia", "risco_queda", "rebelde", "normal"]
        pesos = [10, 20, 10, 60] # 10% Rebeldes, 20% Risco
        
        for i in range(120):
            turma = turmas[i % len(turmas)]
            perfil = random.choices(perfis, weights=pesos)[0]
            genero = random.choice(["M", "F"])
            
            aluno = Aluno(
                Nome=gerar_nome(genero), Data_Nasc=date(2008, 1, 1), Genero=genero,
                Ano=turma.Ano, Turma_id=turma.Turma_id, EE_id=ee.EE_id
            )
            db.add(aluno)
            db.commit()

            # Gerar Dados baseados no Perfil
            disciplinas_da_turma = db.query(TurmaDisciplina).filter_by(Turma_id=turma.Turma_id).all()

            for td in disciplinas_da_turma:
                # NOTAS
                base = 14
                if perfil == "excelencia": base = 18
                elif perfil == "risco_queda": base = 9
                elif perfil == "rebelde": base = 10
                
                # Variação: Se o professor for o "Caro e Mau" (Prof 0), as notas descem 2 pontos
                if td.Professor_id == professores[0].Professor_id:
                    base -= 3
                
                n1 = max(0, min(20, base + random.randint(-2, 2)))
                n2 = max(0, min(20, n1 + random.randint(-2, 2)))
                nf = round((n1+n2)/2)
                
                nota = Nota(Aluno_id=aluno.Aluno_id, Disc_id=td.Disc_id, Nota_1P=n1, Nota_2P=n2, Nota_Final=nf, Ano_letivo="2024/2025")
                db.add(nota)

                # FALTAS (Correlacionadas com disciplina e perfil)
                # Alunos "Risco" faltam muito. Alunos "Rebeldes" faltam um pouco.
                num_faltas = 0
                if perfil == "risco_queda": num_faltas = random.randint(5, 15)
                elif perfil == "rebelde": num_faltas = random.randint(2, 6)
                
                for _ in range(num_faltas):
                    db.add(Falta(
                        Aluno_id=aluno.Aluno_id, Disc_id=td.Disc_id, 
                        Data=date(2024, random.randint(9, 12), random.randint(1, 28)),
                        Justificada=random.choice([True, False])
                    ))

            # OCORRÊNCIAS (Apenas Perfil Rebelde ou Risco)
            if perfil == "rebelde":
                for _ in range(random.randint(1, 4)):
                    db.add(Ocorrencia(
                        Aluno_id=aluno.Aluno_id, Professor_id=disciplinas_da_turma[0].Professor_id,
                        Data=date(2024, random.randint(9, 12), random.randint(1, 28)),
                        Tipo=TipoOcorrenciaEnum.Grave if random.random() > 0.7 else TipoOcorrenciaEnum.Leve,
                        Descricao=random.choice(COMENTARIOS_MAU_COMPORTAMENTO)
                    ))

        # ---------------------------------------------------------
        # 5. FINANÇAS (Expandido e Variado)
        # ---------------------------------------------------------
        print("💰 Finanças Simplificadas...")

        # Fornecedores Essenciais
        f_edp = Fornecedor(Nome="EDP Comercial", NIF="500000001", Tipo="Eletricidade")
        f_aguas = Fornecedor(Nome="SMAS", NIF="500000002", Tipo="Água")
        f_meo = Fornecedor(Nome="MEO", NIF="500000003", Tipo="Internet")
        f_papel = Fornecedor(Nome="Papelaria Central", NIF="500000004", Tipo="Material")
        f_manut = Fornecedor(Nome="Reparações Rápidas", NIF="500000005", Tipo="Manutenção")
        db.add_all([f_edp, f_aguas, f_meo, f_papel, f_manut])
        db.commit()

        # Conta Geral (Um único "saco" para tudo)
        conta_geral = Financiamento(
            Tipo="Gestão Corrente 2024/25", 
            Valor=300000.00, 
            Ano=2024, 
            Observacoes="Orçamento anual para despesas correntes."
        )
        db.add(conta_geral)
        db.commit()

        # Gerar Movimentos Mensais (Set 2024 a Jun 2025)
        # Datas simuladas
        datas = [date(2024, 9, 1), date(2024, 10, 1), date(2024, 11, 1), date(2024, 12, 1),
                 date(2025, 1, 1), date(2025, 2, 1), date(2025, 3, 1), date(2025, 4, 1)]

        for d in datas:
            # RECEITAS (Entra dinheiro)
            db.add(Transacao(
                Tipo=TipoTransacaoEnum.Receita, 
                Valor=35000.00, 
                Data=d.replace(day=5), 
                Descricao="Transferência Ministério", 
                Fin_id=conta_geral.Fin_id
            ))
            db.add(Transacao(
                Tipo=TipoTransacaoEnum.Receita, 
                Valor=random.uniform(1500, 2000), 
                Data=d.replace(day=28), 
                Descricao="Receitas Bar/Bufete", 
                Fin_id=conta_geral.Fin_id
            ))

            # DESPESAS (Sai dinheiro)
            # Eletricidade (varia no inverno)
            valor_luz = 1200 if d.month in [11, 12, 1, 2] else 800
            db.add(Transacao(Tipo=TipoTransacaoEnum.Despesa, Valor=valor_luz, Data=d.replace(day=10), Descricao="Eletricidade", Fin_id=conta_geral.Fin_id, Fornecedor_id=f_edp.Fornecedor_id))
            
            # Água
            db.add(Transacao(Tipo=TipoTransacaoEnum.Despesa, Valor=350, Data=d.replace(day=12), Descricao="Água", Fin_id=conta_geral.Fin_id, Fornecedor_id=f_aguas.Fornecedor_id))
            
            # Net
            db.add(Transacao(Tipo=TipoTransacaoEnum.Despesa, Valor=150, Data=d.replace(day=15), Descricao="Internet", Fin_id=conta_geral.Fin_id, Fornecedor_id=f_meo.Fornecedor_id))

        # Despesa Extra (Para a IA ter o que comentar)
        db.add(Transacao(
            Tipo=TipoTransacaoEnum.Despesa, 
            Valor=2500.00, 
            Data=date(2025, 3, 15), 
            Descricao="Reparação Urgente Telhado (Inverno)", 
            Fin_id=conta_geral.Fin_id, 
            Fornecedor_id=f_manut.Fornecedor_id
        ))

        db.add(AIRecommendation(Texto="Dados Gerados."))
        db.commit()
        print("✅ População Completa! Cenários de IA criados.")

    except Exception as e:
        print(f"❌ Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_advanced()