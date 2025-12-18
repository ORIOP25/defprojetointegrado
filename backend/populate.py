import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import SessionLocal, engine, Base
from app.db.models import (
    Departamento, Escalao, Professor, Staff, Turma,
    EncarregadoEducacao, Aluno, Disciplina, Nota, Financiamento, 
    Fornecedor, Transacao, GeneroEnum, TipoTransacaoEnum, AIRecommendation,
    TurmaDisciplina, Falta, Ocorrencia, TipoOcorrenciaEnum, Matricula
)
from app.core.security import get_password_hash

# --- DADOS GERAIS (RESTURADOS DO TEU ORIGINAL) ---

NOMES_MASCULINOS = ["João", "Pedro", "Tiago", "Lucas", "Mateus", "Duarte", "Tomás", "Gonçalo", "Rodrigo", "Francisco", "Martim", "Santiago", "Afonso", "Miguel", "Guilherme"]
NOMES_FEMININOS = ["Maria", "Ana", "Sofia", "Beatriz", "Leonor", "Matilde", "Carolina", "Mariana", "Inês", "Lara", "Alice", "Francisca", "Clara", "Diana", "Madalena"]
APELIDOS = ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Gomes", "Lopes", "Marques", "Almeida", "Ribeiro", "Pinto", "Carvalho"]

RUAS = ["Rua da Liberdade", "Av. da República", "Tv. das Flores", "Pç. do Comércio", "Rua do Sol", "Av. dos Aliados", "Rua das Acácias", "Caminho do Rio"]
LOCAIS = ["Lisboa", "Porto", "Coimbra", "Braga", "Aveiro", "Faro", "Viseu", "Leiria"]

DEPARTAMENTOS_LISTA = ["Ciências Exatas", "Línguas", "Artes", "Ciências Sociais", "Desporto", "Ciências Naturais", "Serviços Admin"]

ESCALOES_CONFIG = [
    ("Esc 1", 1714.11), ("Esc 2", 1910.67), ("Esc 3", 2073.43), ("Esc 4", 2197.89), ("Esc 5", 2360.65),
    ("Esc 6", 2456.38), ("Esc 7", 2715.45), ("Esc 8", 2982.61), ("Esc 9", 3391.60), ("Esc 10", 3690.84),
]

CARGOS_STAFF = ["Secretário", "Assistente Op.", "Téc. Informática", "Psicólogo", "Segurança", "Bibliotecário", "Cozinheiro"]

# --- CONFIGURAÇÃO DE ANOS E DISCIPLINAS POR CICLO ---

ANOS_LETIVOS = ["2023/2024", "2024/2025", "2025/2026"]

# Matriz Curricular Realista por Ciclo
MATRIZ_CURRICULAR = {
    "2_ciclo": [  # 5º e 6º Ano
        ("Português", "Línguas"), ("Inglês", "Línguas"), ("HGP", "Ciências Sociais"), 
        ("Matemática", "Ciências Exatas"), ("Ciências Naturais", "Ciências Naturais"), 
        ("Educação Visual", "Artes"), ("Educação Musical", "Artes"), ("Educação Física", "Desporto"), ("TIC", "Ciências Exatas")
    ],
    "3_ciclo": [  # 7º ao 9º Ano
        ("Português", "Línguas"), ("Inglês", "Línguas"), ("Francês", "Línguas"), 
        ("História", "Ciências Sociais"), ("Geografia", "Ciências Sociais"), ("Matemática", "Ciências Exatas"), 
        ("Ciências Naturais", "Ciências Naturais"), ("Físico-Química", "Ciências Exatas"), 
        ("Educação Visual", "Artes"), ("Educação Física", "Desporto"), ("TIC", "Ciências Exatas")
    ],
    "secundario": [ # 10º ao 12º Ano (Ciências e Tecnologias)
        ("Português", "Línguas"), ("Inglês", "Línguas"), ("Filosofia", "Ciências Sociais"), 
        ("Matemática A", "Ciências Exatas"), ("Física e Química A", "Ciências Exatas"), 
        ("Biologia e Geologia", "Ciências Naturais"), ("Educação Física", "Desporto")
    ]
}

def get_ciclo(ano_escolar):
    if ano_escolar in [5, 6]: return "2_ciclo"
    if ano_escolar in [7, 8, 9]: return "3_ciclo"
    return "secundario"

# --- FUNÇÕES AUXILIARES (RESTAURADAS) ---

def gerar_nome(genero=None):
    primeiro = random.choice(NOMES_MASCULINOS if genero == "M" else (NOMES_FEMININOS if genero == "F" else NOMES_MASCULINOS + NOMES_FEMININOS))
    return f"{primeiro} {random.choice(APELIDOS)} {random.choice(APELIDOS)}"

def gerar_morada(): return f"{random.choice(RUAS)}, {random.randint(1, 200)}, {random.choice(LOCAIS)}"
def gerar_telefone(): return f"9{random.choice([1, 2, 3, 6])}{random.randint(1000000, 9999999)}"
def limpar_string(texto): return texto.lower().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ç", "c").replace("ã", "a").replace(" ", ".")

# --- POVOAMENTO ---

def populate_advanced():
    db = SessionLocal()
    emails_staff_usados = set()
    emails_prof_usados = set()

    try:
        print("🧹 A Limpar a Base de Dados...")
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        db.commit()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        db.commit()

        # 1. DEPARTAMENTOS & ESCALÕES
        print("🏗️  A criar Estrutura...")
        dept_objs = [Departamento(Nome=d) for d in DEPARTAMENTOS_LISTA]
        db.add_all(dept_objs); db.commit()
        dept_objs = db.query(Departamento).all()
        dept_admin = next((d for d in dept_objs if "Admin" in d.Nome or "Serviços" in d.Nome), dept_objs[-1])

        esc_objs = [Escalao(Nome=n, Valor_Base=v, Descricao="Carreira Docente") for n, v in ESCALOES_CONFIG]
        db.add_all(esc_objs); db.commit()
        esc_objs = db.query(Escalao).all()

        # 2. DISCIPLINAS (Catálogo Completo)
        print("📚 A criar Catálogo de Disciplinas...")
        disc_map = {}
        for ciclo, lista in MATRIZ_CURRICULAR.items():
            for nome, cat in lista:
                if nome not in disc_map:
                    d = Disciplina(Nome=nome, Categoria=cat)
                    db.add(d); db.commit()
                    disc_map[nome] = d

        # 3. STAFF & PROFESSORES (Mantidos entre anos)
        print("👔 A criar Recursos Humanos...")
        admin = Staff(Nome="Admin Principal", email="admin@escola.pt", hashed_password=get_password_hash("pass"), role="admin", Cargo="Diretor", Depart_id=dept_admin.Depart_id, Telefone=gerar_telefone(), Morada=gerar_morada(), Salario=3500.00, Escalao="Direção")
        db.add(admin); emails_staff_usados.add("admin@escola.pt")

        for i in range(15):
            nome = gerar_nome()
            email = f"{limpar_string(nome.split()[0])}.{limpar_string(nome.split()[-1])}{i}@escola.pt"
            s = Staff(Nome=nome, email=email, hashed_password=get_password_hash("123"), role="staff", Cargo=random.choice(CARGOS_STAFF), Depart_id=dept_admin.Depart_id, Telefone=gerar_telefone(), Morada=gerar_morada(), Salario=random.randint(850, 1400), Escalao="Geral")
            db.add(s)

        professores = []
        for i in range(40):
            nome = gerar_nome()
            email = f"prof.{limpar_string(nome.split()[0])}.{i}@escola.pt"
            p = Professor(Nome=nome, email=email, hashed_password=get_password_hash("123"), role="teacher", Data_Nasc=date(random.randint(1970, 1995), 1, 1), Telefone=gerar_telefone(), Morada=gerar_morada(), Depart_id=random.choice(dept_objs).Depart_id, Escalao_id=random.choice(esc_objs).Escalao_id)
            professores.append(p); db.add(p)
        db.commit()

        # 4. CICLO DE ANOS LETIVOS
        print("🔄 A gerar Dados Académicos por Ano Letivo...")
        for ano_letivo in ANOS_LETIVOS:
            print(f"   📅 Processando {ano_letivo}...")
            
            for ano_escolar in range(5, 13):
                ciclo = get_ciclo(ano_escolar)
                
                for letra in ["A", "B"]:
                    dt = random.choice(professores)
                    turma = Turma(Ano=ano_escolar, Turma=letra, AnoLetivo=ano_letivo, DiretorT=dt.Professor_id)
                    db.add(turma); db.commit()

                    # Atribuir Disciplinas CORRETAS para o ano escolar
                    discs_turma = []
                    for nome_d, _ in MATRIZ_CURRICULAR[ciclo]:
                        disc = disc_map[nome_d]
                        prof = random.choice(professores)
                        db.add(TurmaDisciplina(Turma_id=turma.Turma_id, Disc_id=disc.Disc_id, Professor_id=prof.Professor_id))
                        discs_turma.append(disc)
                    
                    # Criar Alunos e Histórico
                    for _ in range(12): # Menos alunos por turma para suportar 3 anos sem ficar lento
                        gen = random.choice(["M", "F"])
                        nome_aluno = gerar_nome(gen)
                        ee = EncarregadoEducacao(Nome=gerar_nome(), Telefone=gerar_telefone(), Email=f"ee{random.randint(1,9999)}@gmail.com", Morada=gerar_morada(), Relacao="Pai/Mãe")
                        db.add(ee); db.commit()

                        aluno = Aluno(Nome=nome_aluno, Data_Nasc=str(date(2024-ano_escolar-6, 1, 1)), Telefone=gerar_telefone(), Morada=ee.Morada, Genero=GeneroEnum.M if gen=="M" else GeneroEnum.F, Turma_id=turma.Turma_id, Enc_Educacao_id=ee.EE_id, Escalao=random.choice(["A", "B", None]), Ano=ano_escolar)
                        db.add(aluno); db.commit()
                        db.add(Matricula(Aluno_id=aluno.Aluno_id, Turma_id=turma.Turma_id))

                        # Notas
                        for d in discs_turma:
                            n1, n2, n3 = random.randint(8, 18), random.randint(8, 18), random.randint(8, 18)
                            db.add(Nota(Aluno_id=aluno.Aluno_id, Disc_id=d.Disc_id, Nota_1P=n1, Nota_2P=n2, Nota_3P=n3, Nota_Final=round((n1+n2+n3)/3), Ano_letivo=ano_letivo))
                    db.commit()

        # 5. FINANÇAS (COMPLETO: FORNECEDORES, INVESTIMENTOS E TRANSAÇÕES)
        print("💰 A gerar ecossistema financeiro completo...")

        # 1. Lista de Fornecedores
        fornecedores = [
            Fornecedor(Nome="EDP Comercial", NIF="500100200", Tipo="Energia"),
            Fornecedor(Nome="Staples Portugal", NIF="500300400", Tipo="Papelaria"),
            Fornecedor(Nome="Worten Equipamentos", NIF="500500600", Tipo="Tecnologia"),
            Fornecedor(Nome="Águas da Região", NIF="500700800", Tipo="Utilidades"),
            Fornecedor(Nome="Livraria Escolar", NIF="500900100", Tipo="Livros/Manuais")
        ]
        db.add_all(fornecedores)
        db.commit()

        # 2. Lista de Financiamentos (Centros de Custo / Projetos)
        investimentos = [
            Financiamento(Tipo="Orçamento Estado (DGEstE)", Valor=450000.00, Ano=2024, Observacoes="Verba anual principal"),
            Financiamento(Tipo="Projeto Erasmus+ (Mobilidade)", Valor=25000.00, Ano=2024, Observacoes="Intercâmbio de alunos e staff"),
            Financiamento(Tipo="Câmara Municipal (ASE)", Valor=15000.00, Ano=2024, Observacoes="Ação Social Escolar e Refeitório"),
            Financiamento(Tipo="Fundo de Modernização Lab. Informática", Valor=12500.00, Ano=2024, Observacoes="Compra de novos servidores e PCs"),
            Financiamento(Tipo="PRR - Escola Digital", Valor=85000.00, Ano=2024, Observacoes="Equipamentos tecnológicos para alunos"),
            Financiamento(Tipo="Associação de Pais (Donativo)", Valor=2500.00, Ano=2024, Observacoes="Melhoria do espaço de recreio"),
            Financiamento(Tipo="Receitas Próprias (Bar/Papelaria)", Valor=8000.00, Ano=2024, Observacoes="Auto-financiamento mensal acumulado")
        ]
        db.add_all(investimentos)
        db.commit()

        # 3. Criar Transações de RECEITA (Entrada do dinheiro na conta)
        print("📥 A registar entradas de verbas...")
        for inv in investimentos:
            db.add(Transacao(
                Tipo=TipoTransacaoEnum.Receita, 
                Valor=inv.Valor, 
                Data=date.today(), 
                Descricao=f"Recebimento: {inv.Tipo}", 
                Fin_id=inv.Fin_id
            ))
        db.commit()

        # 4. Criar Transações de DESPESA (Saídas reais de dinheiro)
        print("💸 A gerar histórico de gastos e faturas...")
        
        gastos_planeados = [
            # Despesas do Orçamento de Estado
            {"desc": "Fatura EDP - Janeiro", "valor": 1250.00, "ref": "Orçamento Estado"},
            {"desc": "Fatura Águas - Janeiro", "valor": 450.00, "ref": "Orçamento Estado"},
            {"desc": "Reserva de Papel A4 (50 caixas)", "valor": 890.00, "ref": "Orçamento Estado"},
            
            # Despesas do Erasmus+
            {"desc": "Seguros de Viagem - Grupo Mobilidade", "valor": 420.00, "ref": "Erasmus+"},
            {"desc": "Alojamento em Berlim (Staff)", "valor": 3800.00, "ref": "Erasmus+"},

            # Despesas do PRR - Escola Digital
            {"desc": "Lote 1: 30 Portáteis Híbridos", "valor": 18000.00, "ref": "PRR"},
            {"desc": "Instalação de Painéis Interativos", "valor": 5500.00, "ref": "PRR"},

            # Despesas do Laboratório de Informática
            {"desc": "Servidor de Ficheiros ProLiant", "valor": 2400.00, "ref": "Modernização Lab"},
            {"desc": "Cablagem e Switches Gigabit", "valor": 850.00, "ref": "Modernização Lab"},

            # Despesas da Ação Social Escolar (ASE)
            {"desc": "Fornecimento de Fruta e Laticínios", "valor": 1200.00, "ref": "Câmara Municipal"},
            {"desc": "Manuais Escolares (Escalão A/B)", "valor": 4200.00, "ref": "Câmara Municipal"},

            # Despesas de Receitas Próprias
            {"desc": "Stock de Bebidas e Cafetaria", "valor": 600.00, "ref": "Receitas Próprias"},
            {"desc": "Reparação de Fotocopiadora Central", "valor": 320.00, "ref": "Receitas Próprias"}
        ]

        for gasto in gastos_planeados:
            # Procura o ID do financiamento baseado no nome parcial (ref)
            fin_correto = db.query(Financiamento).filter(Financiamento.Tipo.contains(gasto["ref"])).first()
            
            if fin_correto:
                db.add(Transacao(
                    Tipo=TipoTransacaoEnum.Despesa,
                    Valor=gasto["valor"],
                    Data=date.today(),
                    Descricao=gasto["desc"],
                    Fin_id=fin_correto.Fin_id
                ))

        db.commit()
        print("✅ Ecossistema financeiro (Receitas e Despesas) concluído!")      


        
        db.commit()
        print("✅ Base de Dados Populada com Sucesso!")

    except Exception as e:
        print(f"❌ Erro fatal: {e}"); db.rollback()
    finally: db.close()

if __name__ == "__main__":
    populate_advanced()