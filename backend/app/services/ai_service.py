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
        joinedload(models.Aluno.turma)
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
        if aluno.turma:
            # Reconstruir o mapa baseando-se nas disciplinas que ele tem notas
            for n in aluno.notas:
                key = f"{aluno.Turma_id}_{n.Disc_id}"
                profs_aluno[n.disciplina.Nome] = mapa_professores.get(key, "N/A")

        lista_alunos.append({
            "Nome": aluno.Nome,
            "Turma": f"{aluno.turma.Ano}º{aluno.turma.Turma}" if aluno.turma else "S/T",
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
        Tu és o Consultor Estratégico de Elite do SIGE. O Diretor paga-te para encontrares problemas graves e oportunidades de ouro, não para descreveres o óbvio.
        
        --- TUA MISSÃO ---
        Analisa os dados RAW abaixo. Ignora a média. Procura os **Outliers** (os extremos).
        
        --- DADOS ---
        {json.dumps(dados, ensure_ascii=False)}
        
        --- REGRAS ESTRITAS DE GERAÇÃO ---
        1. **Lei do Top 5:** Para cada insight, a lista de 'detalhes' NÃO PODE ter mais de 5 linhas. Escolhe apenas os 5 casos mais chocantes. Se houver 60 alunos em risco, mostra apenas os 5 piores e diz na descrição "Identificados 60 alunos, sendo estes os 5 mais críticos...".
        
        2. **Foco no ROI (Professores):**
           - Encontra professores com Salário Alto (>2000€) e Média de Notas Baixa (<10). Isto é um "Alerta de Ineficiência".
           - Encontra professores com Salário Baixo e Média Alta. Isto é um "Talento a Reter".
        
        3. **Detetive de Quedas (Alunos):**
           - Não listes apenas notas baixas. Procura a **Queda**. Quem tinha 15 e agora tem 8?
           - Na tabela de detalhes, não ponhas todas as notas. Põe apenas a disciplina do problema (ex: "Matemática: 14 -> 8").
        
        4. **Formatação Limpa:** - Nas tabelas ('detalhes'), as chaves devem ser curtas e bonitas (ex: "Professor", "Salario", "Media_Turma" em vez de "nome_do_professor_com_underscores").
           - Valores monetários formatados (ex: "2.300 €").

        --- FORMATO JSON DE RESPOSTA ---
        [
          {{
            "categoria": "Eficiência Docente (RH)",
            "cor": "blue",
            "insights": [
              {{
                "tipo": "negativo", 
                "titulo": "Alerta de Custo-Benefício: Docentes Caros com Baixo Rendimento",
                "descricao": "Detetados 2 professores do topo da carreira cujas turmas apresentam média negativa consistente. Situação crítica de ROI.",
                "sugestao": "Agendar reunião de avaliação pedagógica com estes docentes e rever atribuição de turmas.",
                "detalhes": [
                  {{ "Professor": "Nome X", "Escalao": "Esc 9", "Custo_Mensal": "3.100 €", "Media_Atribuida": "9.4", "Status": "CRÍTICO" }}
                ]
              }}
            ]
          }},
          {{
            "categoria": "Risco Académico",
            "cor": "red",
            "insights": [
               {{
                 "tipo": "negativo",
                 "titulo": "Alunos em Queda Livre (Top 5 Críticos)",
                 "descricao": "Estes alunos tiveram um colapso de rendimento superior a 4 valores. Forte correlação com faltas.",
                 "sugestao": "Contacto urgente com Encarregados de Educação.",
                 "detalhes": [
                    {{ "Aluno": "Nome Y", "Turma": "10ºA", "Disciplina": "Matemática A", "Queda": "16 -> 8 (-8)", "Faltas": "5 (Injust.)" }}
                 ]
               }}
            ]
          }}
        ]
        """
        
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite", # Usar Flash para rapidez e janela de contexto grande
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
        Atua como um Consultor de Gestão Escolar Sénior e Analista de Dados do SIGE.
        O teu interlocutor é o Diretor da Escola. Ele exige respostas factuais, profundas e estratégicas para a tomada de decisão.

        --- CONTEXTO DE DADOS (A TUA FONTE DE VERDADE) ---
        Tens acesso exclusivo aos seguintes dados da escola:
        {json.dumps(dados, ensure_ascii=False)}

        --- DIRETRIZES DE RESPOSTA ---
        1. **Precisão Cirúrgica:** Nunca generalizes. Em vez de dizer "alguns alunos desceram", diz "3 alunos (ex: João Silva) desceram mais de 4 valores a Matemática". Usa sempre números, percentagens e nomes específicos quando disponíveis nos dados.

        2. **Regra do "Top 5":** Se identificares muitos casos (ex: mais de 5 alunos em risco), NÃO faças listas infinitas. 
           - Apresenta uma tabela ou lista apenas com os **5 casos mais graves**.
           - Resume o resto: "Identifiquei mais X alunos com padrões semelhantes..."
        
        3. **Análise Cruzada (O Teu Superpoder):**
           - Ao analisar um **Aluno**: Não olhes só para as notas. Verifica se a descida de notas coincide com um aumento de faltas ou ocorrências disciplinares. Verifica quem é o professor dessa disciplina específica.
           - Ao analisar **Professores**: Cruza o seu custo (salário/escalão) com o rendimento académico das suas turmas. Identifica casos de alto custo/baixo rendimento ou baixo custo/alto rendimento.
           - Ao analisar **Finanças**: Detalha despesas. Se houver um valor alto, identifica o fornecedor e a data.

        4. **Protocolo de Ausência de Dados:** - Se a pergunta exigir dados que não estão no JSON acima, responde apenas: "Não disponho dessa informação específica nos registos atuais." 
           - **Proibido:** Nunca menciones "limitações da API", "funções Python", "JSON incompleto" ou desculpas técnicas. Mantém a ilusão de um sistema integrado.

        5. **Tom e Formatação:**
           - Usa um tom profissional, executivo mas humano. Sê o braço direito do diretor.
           - Usa tabelas Markdown APENAS se tiveres mais de 3 colunas de dados para comparar. Se for simples, usa listas (`*`).
           - Usa negrito para destacar valores críticos (ex: **Queda de 50%**).
           - Idioma: Português de Portugal.

        --- OBJETIVO FINAL ---
        A tua resposta deve ser tão completa que o Diretor não precise de fazer uma pergunta de seguimento. Antecipa as necessidades dele. Se ele pergunta "Quem é o pior aluno?", diz quem é, em que disciplina, quem é o professor, se tem faltas e qual a tendência.

        --- PERGUNTA DO DIRETOR ---
        "{user_message}"
        """
        
        response = client.models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)
        return response.text
    except Exception as e:
        print(f"Erro Chat: {e}")
        return "Desculpe, ocorreu um erro técnico ao processar a sua análise."