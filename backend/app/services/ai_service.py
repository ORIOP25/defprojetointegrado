import os
import json
from google import genai
from google.genai import types
from sqlalchemy.orm import Session, joinedload
from app.db import models
from dotenv import load_dotenv
from datetime import date

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def get_school_context(db: Session):
    """
    COLETA DE DADOS BRUTOS (RAW DATA).
    O objetivo é não 'mastigar' a informação. A IA deve receber os factos 
    e tirar as suas próprias conclusões.
    """
    
    # --- 1. MAPEAMENTO DE ESTRUTURA E RH (CUSTOS VS RECURSOS) ---
    # Buscamos professores com os seus salários (Escalão) para análise de ROI
    profs_db = db.query(models.Professor).options(joinedload(models.Professor.escalao)).all()
    professores = []
    for p in profs_db:
        professores.append({
            "ID": p.Professor_id,
            "Nome": p.Nome,
            "Dept": p.departamento.Nome if p.departamento else "Geral",
            "Idade": (date.today() - p.Data_Nasc).days // 365,
            "Salario": float(p.escalao.Valor_Base) if p.escalao else 0,
            "Escalao": p.escalao.Nome if p.escalao else "N/A"
        })

    # Mapa: Quem dá aula a quem? (Fundamental para atribuir culpas/méritos)
    atribuicoes = db.query(models.TurmaDisciplina).all()
    # Chave: "TurmaID_DisciplinaID" -> Valor: "NomeProfessor"
    mapa_professores = {}
    for a in atribuicoes:
        key = f"{a.Turma_id}_{a.Disc_id}"
        mapa_professores[key] = next((p["Nome"] for p in professores if p["ID"] == a.Professor_id), "N/A")

    # --- 2. DADOS DE ALUNOS (COMPORTAMENTO + ACADÉMICO) ---
    # Carregar tudo de uma vez para eficiência
    alunos_db = db.query(models.Aluno).options(
        joinedload(models.Aluno.notas).joinedload(models.Nota.disciplina),
        joinedload(models.Aluno.faltas).joinedload(models.Falta.disciplina),
        joinedload(models.Aluno.ocorrencias),
        joinedload(models.Aluno.turma_obj)
    ).all()

    lista_alunos = []
    
    for aluno in alunos_db:
        # Organizar Notas por Disciplina
        notas_dict = {}
        for n in aluno.notas:
            nome_disc = n.disciplina.Nome
            if nome_disc not in notas_dict: notas_dict[nome_disc] = []
            # Enviamos a evolução temporal das notas [P1, P2, Final]
            notas_dict[nome_disc] = [n.Nota_1P or 0, n.Nota_2P or 0, n.Nota_Final or 0]

        # Organizar Faltas
        faltas_summary = {"Total": 0, "Disciplinas_Afetadas": []}
        if aluno.faltas:
            faltas_summary["Total"] = len(aluno.faltas)
            # Lista de disciplinas onde faltou e se foi justificado
            detalhe_faltas = [f"{f.disciplina.Nome} ({'J' if f.Justificada else 'I'})" for f in aluno.faltas if f.disciplina]
            faltas_summary["Disciplinas_Afetadas"] = detalhe_faltas

        # Organizar Ocorrências (Comportamento)
        ocorrencias_lista = []
        for o in aluno.ocorrencias:
            ocorrencias_lista.append(f"[{o.Data}] ({o.Tipo.value}) {o.Descricao}")

        # Identificar Professor de cada disciplina deste aluno
        # Para que a IA saiba: "Este aluno tem más notas a Mat com o Prof X"
        profs_aluno = {}
        if aluno.turma_obj:
            # Reconstruir o mapa baseando-se nas disciplinas que ele tem notas
            for n in aluno.notas:
                key = f"{aluno.Turma_id}_{n.Disc_id}"
                profs_aluno[n.disciplina.Nome] = mapa_professores.get(key, "N/A")

        lista_alunos.append({
            "Nome": aluno.Nome,
            "Turma": f"{aluno.turma_obj.Ano}º{aluno.turma_obj.Turma}" if aluno.turma_obj else "S/T",
            "Genero": aluno.Genero.value,
            "Notas_Evolucao": notas_dict, # Ex: {"Mat": [10, 8, 8]} -> IA vê a queda
            "Professores": profs_aluno,   # Ex: {"Mat": "Prof. Mau"}
            "Faltas": faltas_summary,
            "Comportamento": ocorrencias_lista
        })

    # --- 3. FINANÇAS ---
    transacoes = db.query(models.Transacao).limit(50).all()
    financas = [{
        "Data": str(t.Data),
        "Tipo": t.Tipo.value,
        "Valor": float(t.Valor or 0),
        "Desc": t.Descricao
    } for t in transacoes]

    # --- PACOTE FINAL PARA O CÉREBRO DA IA ---
    return {
        "RECURSOS_HUMANOS": professores,
        "ALUNOS_DETALHADO": lista_alunos, # A IA terá de iterar isto para achar padrões
        "FINANCAS_TRANSACOES": financas,
        "META_INFO": {
            "Total_Alunos": len(lista_alunos),
            "Data_Relatorio": str(date.today())
        }
    }

def get_latest_report(db: Session):
    rec = db.query(models.AIRecommendation).order_by(models.AIRecommendation.AI_id.desc()).first()
    if rec and rec.Texto:
        try: return json.loads(rec.Texto)
        except: return None
    return None

def generate_and_save_insights(db: Session):
    if not client: return []
    try:
        dados = get_school_context(db)
        
        # PROMPT DE ENGENHARIA DE DADOS
        # Ensinamos a IA a pensar como um Gestor Escolar
        prompt = f"""
        Tu és um Consultor de Gestão Escolar de Elite.
        Tens acesso aos dados RAW da escola (JSON abaixo).
        
        A tua tarefa é cruzar dados para encontrar Insights que um humano não veria facilmente.
        
        --- DADOS ---
        {json.dumps(dados, ensure_ascii=False)}
        
        --- OBJETIVOS DA ANÁLISE ---
        1. **Desempenho Docente (ROI):** Cruza os salários dos professores com as notas dos alunos deles. Existe algum professor muito caro com maus resultados? Ou um barato com ótimos resultados?
        2. **Comportamento vs Notas:** Analisa os alunos com "Ocorrências" ou muitas "Faltas". A queda das notas coincide com o mau comportamento?
        3. **Alertas Críticos:** Identifica alunos em "Queda Livre" (começaram bem e acabaram mal).
        
        --- FORMATO DE SAÍDA (JSON ESTRITO) ---
        Deves gerar um JSON compatível com o frontend:
        [
          {{
            "categoria": "Titulo da Categoria (ex: Recursos Humanos, Risco Escolar)",
            "cor": "blue" (ou red/green),
            "insights": [
              {{
                "tipo": "negativo" (ou positivo/neutro),
                "titulo": "Resumo curto",
                "descricao": "Explicação detalhada da causalidade encontrada.",
                "sugestao": "Ação concreta para o diretor.",
                "detalhes": [ {{ "Chave": "Valor", "Chave2": "Valor2" }} ] (Tabela de evidências)
              }}
            ]
          }}
        ]
        """
        
        response = client.models.generate_content(
            model="gemini-2.5-pro", # Usar Flash para rapidez e janela de contexto grande
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        
        res_json = json.loads(response.text)
        
        # Guardar na BD
        db.add(models.AIRecommendation(Texto=json.dumps(res_json, ensure_ascii=False)))
        db.commit()
        return res_json
    except Exception as e:
        print(f"Erro AI Service: {e}")
        return []

def chat_with_data(db: Session, user_message: str):
    if not client: return "Erro: API Key não configurada."
    try:
        dados = get_school_context(db)
        
        prompt = f"""
        Tu és o Cérebro Analítico do SIGE. Estás a falar com o Diretor da Escola.
        Tens acesso total à base de dados em JSON abaixo.

        --- DADOS DO SISTEMA ---
        {json.dumps(dados, ensure_ascii=False)}

        --- INSTRUÇÕES ---
        1. **Cruza Tabelas:** Se perguntarem por um aluno, verifica quem são os professores dele e se ele tem faltas nessas aulas específicas.
        2. **Sê Específico:** Não digas "as notas variam". Diz "As notas variam entre 10 e 18, com queda acentuada a Matemática no 2º período".
        3. **Contexto Financeiro:** Se a pergunta tocar em dinheiro, verifica sempre se os salários (Recursos Humanos) não são a causa oculta do problema.
        4. **Estilo:** Profissional, direto, Português de Portugal. Usa Markdown para tabelas se necessário.

        --- PERGUNTA DO UTILIZADOR ---
        "{user_message}"
        """
        
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return response.text
    except Exception as e:
        print(f"Erro Chat: {e}")
        return "Desculpe, ocorreu um erro técnico ao processar a sua análise."