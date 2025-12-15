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

# --- DADOS GERAIS ---

NOMES_MASCULINOS = ["João", "Pedro", "Tiago", "Lucas", "Mateus", "Duarte", "Tomás", "Gonçalo", "Rodrigo", "Francisco", "Martim", "Santiago", "Afonso", "Miguel", "Guilherme"]
NOMES_FEMININOS = ["Maria", "Ana", "Sofia", "Beatriz", "Leonor", "Matilde", "Carolina", "Mariana", "Inês", "Lara", "Alice", "Francisca", "Clara", "Diana", "Madalena"]
APELIDOS = ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Gomes", "Lopes", "Marques", "Almeida", "Ribeiro", "Pinto", "Carvalho"]

RUAS = ["Rua da Liberdade", "Av. da República", "Tv. das Flores", "Pç. do Comércio", "Rua do Sol", "Av. dos Aliados", "Rua das Acácias", "Caminho do Rio"]
LOCAIS = ["Lisboa", "Porto", "Coimbra", "Braga", "Aveiro", "Faro", "Viseu", "Leiria"]

# Lista de Departamentos
DEPARTAMENTOS_LISTA = ["Ciências Exatas", "Línguas", "Artes", "Ciências Sociais", "Desporto", "Serviços Admin"]

# Configuração dos Escalões (Nome Curto <= 10 chars, Valor Base)
# CORREÇÃO: Nomes encurtados para caber no String(10)
ESCALOES_CONFIG = [
    ("Esc 1", 1714.11),
    ("Esc 2", 1910.67),
    ("Esc 3", 2073.43),
    ("Esc 4", 2197.89),
    ("Esc 5", 2360.65),
    ("Esc 6", 2456.38),
    ("Esc 7", 2715.45),
    ("Esc 8", 2982.61),
    ("Esc 9", 3391.60),
    ("Esc 10", 3690.84),
]

DISCIPLINAS_CONFIG = [
    {"nome": "Matemática A", "cat": "Ciências"},
    {"nome": "Fís-Química A", "cat": "Ciências"}, # Encurtado por segurança
    {"nome": "Português", "cat": "Línguas"},
    {"nome": "Inglês", "cat": "Línguas"},
    {"nome": "História A", "cat": "Humanidades"},
    {"nome": "Oficina Artes", "cat": "Artes"},
    {"nome": "Ed. Física", "cat": "Desporto"},
    {"nome": "Filosofia", "cat": "Humanidades"},
    {"nome": "Geografia A", "cat": "Humanidades"},
]

CARGOS_STAFF = ["Secretário", "Assistente Op.", "Téc. Informática", "Psicólogo", "Segurança", "Bibliotecário", "Cozinheiro"]

# --- FUNÇÕES AUXILIARES ---

def gerar_nome(genero=None):
    if genero == "M":
        primeiro = random.choice(NOMES_MASCULINOS)
    elif genero == "F":
        primeiro = random.choice(NOMES_FEMININOS)
    else:
        primeiro = random.choice(NOMES_MASCULINOS + NOMES_FEMININOS)
    
    return f"{primeiro} {random.choice(APELIDOS)} {random.choice(APELIDOS)}"

def gerar_morada():
    return f"{random.choice(RUAS)}, {random.randint(1, 200)}, {random.choice(LOCAIS)}"

def gerar_telefone():
    return f"9{random.choice([1, 2, 3, 6])}{random.randint(1000000, 9999999)}"

def limpar_string(texto):
    # Remove acentos e converte para minúsculas para emails
    return texto.lower().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ç", "c").replace("ã", "a").replace(" ", ".")

def populate_advanced():
    db = SessionLocal()
    try:
        print("🧹 A Limpar a Base de Dados antiga...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        # ---------------------------------------------------------
        # 1. DEPARTAMENTOS & ESCALÕES
        # ---------------------------------------------------------
        print("🏗️  A criar Estrutura (Departamentos e Escalões)...")
        
        dept_objs = []
        for d_nome in DEPARTAMENTOS_LISTA:
            dept = Departamento(Nome=d_nome)
            db.add(dept)
            dept_objs.append(dept)
        db.commit() 
        
        # Garantir IDs frescos
        dept_objs = db.query(Departamento).all()
        # Identificar o departamento admin (o último ou pelo nome)
        dept_admin = next((d for d in dept_objs if "Admin" in d.Nome), dept_objs[-1])

        esc_objs = []
        for nome, valor in ESCALOES_CONFIG:
            esc = Escalao(Nome=nome, Valor_Base=valor, Descricao="Carreira Docente")
            db.add(esc)
            esc_objs.append(esc)
        db.commit()
        esc_objs = db.query(Escalao).all()

        # ---------------------------------------------------------
        # 2. STAFF & PROFESSORES
        # ---------------------------------------------------------
        print("👔 A criar Recursos Humanos...")

        # 2.1 ADMIN GLOBAL
        admin = Staff(
            Nome="Admin Principal",
            email="admin@escola.pt",
            hashed_password=get_password_hash("pass"),
            role="admin", # Importante ser "admin"
            Cargo="Diretor",
            Depart_id=dept_admin.Depart_id,
            Telefone=gerar_telefone(),
            Morada=gerar_morada(),
            Salario=3500.00,
            Escalao="Direção"
        )
        db.add(admin)

        # 2.2 STAFF (Não Docente)
        for i in range(15):
            nome = gerar_nome()
            primeiro = nome.split()[0]
            ultimo = nome.split()[-1]
            email = f"{limpar_string(primeiro)}.{limpar_string(ultimo)}@escola.pt"
            
            s = Staff(
                Nome=nome,
                email=email,
                hashed_password=get_password_hash("123"),
                role="staff",
                Cargo=random.choice(CARGOS_STAFF),
                Depart_id=dept_admin.Depart_id,
                Telefone=gerar_telefone(),
                Morada=gerar_morada(),
                Salario=random.randint(850, 1400) + random.choice([0.00, 0.50, 0.25]),
                Escalao="Geral"
            )
            db.add(s)
        
        # 2.3 PROFESSORES
        professores = []
        # Depts docentes são todos menos o Admin
        depts_docentes = [d for d in dept_objs if "Admin" not in d.Nome]

        for i in range(30):
            nome = gerar_nome()
            primeiro = nome.split()[0]
            ultimo = nome.split()[-1]
            email = f"{limpar_string(primeiro)}.{limpar_string(ultimo)}@escola.pt"
            
            dept_random = random.choice(depts_docentes)
            # Distribuição de escalões (mais no meio da carreira)
            esc_random = random.choices(esc_objs, weights=[5, 10, 20, 20, 15, 10, 10, 5, 3, 2])[0]

            p = Professor(
                Nome=nome,
                email=email,
                hashed_password=get_password_hash("123"),
                role="teacher", # Usar 'teacher' para consistência com frontend
                Data_Nasc=date(random.randint(1965, 1995), random.randint(1, 12), random.randint(1, 28)),
                Telefone=gerar_telefone(),
                Morada=gerar_morada(),
                Depart_id=dept_random.Depart_id,
                Escalao_id=esc_random.Escalao_id
            )
            professores.append(p)
            db.add(p)
        
        db.commit()

        # ---------------------------------------------------------
        # 3. ACADÉMICO (Turmas e Disciplinas)
        # ---------------------------------------------------------
        print("📚 A criar Turmas e Disciplinas...")
        
        disciplinas = [Disciplina(Nome=d["nome"], Categoria=d["cat"]) for d in DISCIPLINAS_CONFIG]
        db.add_all(disciplinas)
        db.commit()

        turmas = []
        # Cria turmas do 5º ao 12º ano (A, B, C)
        for ano in range(5, 13):
            for letra in ["A", "B", "C"]:
                dt = random.choice(professores)
                t = Turma(Ano=ano, Turma=letra, AnoLetivo="2024/2025", DiretorT=dt.Professor_id)
                turmas.append(t)
        db.add_all(turmas)
        db.commit()

        # Atribuir Disciplinas às Turmas
        for turma in turmas:
            discs_turma = random.sample(disciplinas, k=6)
            # Garantir Portugues e Ed Fisica
            pt = next((d for d in disciplinas if "Português" in d.Nome), None)
            ef = next((d for d in disciplinas if "Física" in d.Nome and "Ed" in d.Nome), None)
            
            if pt and pt not in discs_turma: discs_turma.append(pt)
            if ef and ef not in discs_turma: discs_turma.append(ef)

            for disc in discs_turma:
                prof = random.choice(professores)
                td = TurmaDisciplina(Turma_id=turma.Turma_id, Disc_id=disc.Disc_id, Professor_id=prof.Professor_id)
                db.add(td)
        db.commit()

        # ---------------------------------------------------------
        # 4. ALUNOS COMPLETOS
        # ---------------------------------------------------------
        print("🎓 A matricular Alunos (com EE, Notas e Faltas)...")

        for turma in turmas:
            # 22 alunos por turma
            num_alunos = 22
            
            for _ in range(num_alunos):
                genero_str = random.choice(["M", "F"])
                # Mapear para Enum se necessário (depende do DB driver, mas string costuma passar)
                genero_enum = GeneroEnum.M if genero_str == "M" else GeneroEnum.F
                
                nome_aluno = gerar_nome(genero_str)
                primeiro_aluno = nome_aluno.split()[0]
                
                morada_familia = gerar_morada()
                
                # 1. EE
                nome_ee = gerar_nome()
                primeiro_ee = nome_ee.split()[0]
                ee = EncarregadoEducacao(
                    Nome=nome_ee,
                    Telefone=gerar_telefone(),
                    Email=f"{limpar_string(primeiro_ee)}.ee@gmail.com",
                    Morada=morada_familia,
                    Relacao=random.choice(["Pai", "Mãe"])
                )
                db.add(ee)
                db.flush()

                # 2. Aluno
                ano_nasc = 2024 - turma.Ano - 6
                aluno = Aluno(
                    Nome=nome_aluno,
                    Data_Nasc=date(ano_nasc, random.randint(1, 12), random.randint(1, 28)),
                    Telefone=gerar_telefone(),
                    Morada=morada_familia,
                    Genero=genero_enum,
                    Ano=turma.Ano,
                    Turma_id=turma.Turma_id,
                    Escalao=random.choice(["A", "B", "C", None, None]), # C é sem escalão no frontend as vezes
                    EE_id=ee.EE_id
                )
                db.add(aluno)
                db.flush()

                # 3. Notas e Faltas
                discs_desta_turma = db.query(TurmaDisciplina).filter_by(Turma_id=turma.Turma_id).all()
                perfil = random.choices(["bom", "medio", "mau"], weights=[20, 60, 20])[0]

                for td in discs_desta_turma:
                    base = 16 if perfil == "bom" else (13 if perfil == "medio" else 9)
                    n1 = max(0, min(20, base + random.randint(-3, 3)))
                    n2 = max(0, min(20, n1 + random.randint(-2, 2)))
                    n3 = max(0, min(20, n2 + random.randint(-2, 2)))
                    nf = round((n1 + n2 + n3) / 3)

                    nota = Nota(
                        Aluno_id=aluno.Aluno_id,
                        Disc_id=td.Disc_id,
                        Nota_1P=n1,
                        Nota_2P=n2,
                        Nota_3P=n3,
                        Nota_Final=nf,
                        Ano_letivo="2024/2025"
                    )
                    db.add(nota)

                    # Faltas
                    if random.random() > 0.8:
                        num_faltas = random.randint(1, 3)
                        for _ in range(num_faltas):
                            f = Falta(
                                Aluno_id=aluno.Aluno_id,
                                Disc_id=td.Disc_id,
                                Data=date(2024, random.randint(9, 12), random.randint(1, 28)),
                                Justificada=random.choice([True, False])
                            )
                            db.add(f)
                
                # 4. Ocorrência (raro)
                if perfil == "mau" and random.random() > 0.8:
                    oc = Ocorrencia(
                        Aluno_id=aluno.Aluno_id,
                        Professor_id=turma.DiretorT,
                        Data=date(2024, 11, 15),
                        Tipo=TipoOcorrenciaEnum.Grave,
                        Descricao="Comportamento inadequado na sala de aula."
                    )
                    db.add(oc)

            db.commit()

        # ---------------------------------------------------------
        # 5. FINANÇAS
        # ---------------------------------------------------------
        print("💰 A gerar Dados Financeiros...")
        
        f1 = Fornecedor(Nome="EDP Comercial", NIF="500100200", Tipo="Eletricidade")
        f2 = Fornecedor(Nome="Papelaria Central", NIF="500300400", Tipo="Material Escolar")
        f3 = Fornecedor(Nome="TechSolutions", NIF="500500600", Tipo="Equipamento Informático")
        db.add_all([f1, f2, f3])
        db.commit()

        fin = Financiamento(Tipo="Orçamento Estado 2024", Valor=500000.00, Ano=2024)
        db.add(fin)
        db.commit()

        t1 = Transacao(Tipo=TipoTransacaoEnum.Receita, Valor=500000.00, Data=date(2024, 1, 10), Descricao="Transferência Ministério", Fin_id=fin.Fin_id)
        t2 = Transacao(Tipo=TipoTransacaoEnum.Despesa, Valor=1250.40, Data=date(2024, 2, 15), Descricao="Fatura Eletricidade Jan", Fin_id=fin.Fin_id, Fornecedor_id=f1.Fornecedor_id)
        t3 = Transacao(Tipo=TipoTransacaoEnum.Despesa, Valor=450.00, Data=date(2024, 2, 20), Descricao="Resmas de Papel A4", Fin_id=fin.Fin_id, Fornecedor_id=f2.Fornecedor_id)
        db.add_all([t1, t2, t3])
        
        db.add(AIRecommendation(Texto="Sistema inicializado com sucesso."))
        
        db.commit()
        print("✅ Base de Dados Populada com Sucesso!")

    except Exception as e:
        print(f"❌ Erro fatal ao popular: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_advanced()