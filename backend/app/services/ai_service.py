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
    COLETA E PRÉ-PROCESSAMENTO HÍBRIDO.
    O Python calcula as métricas exatas (médias, contagens) para evitar alucinações.
    A IA recebe apenas os factos consumados para gerar a narrativa.
    """
    
    # --- 1. PREPARAR DADOS DE PROFESSORES ---
    profs_db = db.query(models.Professor).options(joinedload(models.Professor.escalao)).all()
    prof_stats = {} 
    
    for p in profs_db:
        salario = float(p.escalao.Valor_Base) if p.escalao else 0
        prof_stats[p.Nome] = {
            "ID": p.Professor_id,
            "Escalao": p.escalao.Nome if p.escalao else "N/A",
            "Salario": salario,
            "Soma_Notas": 0,
            "Qtd_Notas": 0,
            "Turmas": set()
        }

    # Mapa de Atribuições: (TurmaID, DiscID) -> Nome Professor
    # Isto permite saber quem deu a nota X ao aluno Y
    atribuicoes = db.query(models.TurmaDisciplina).all()
    mapa_aulas = {}
    prof_id_nome = {p.Professor_id: p.Nome for p in profs_db}

    for a in atribuicoes:
        key = (a.Turma_id, a.Disc_id)
        nome_prof = prof_id_nome.get(a.Professor_id)
        if nome_prof:
            mapa_aulas[key] = nome_prof

    # --- 2. PROCESSAR ALUNOS E ATRIBUIR METRICAS ---
    alunos_db = db.query(models.Aluno).options(
        joinedload(models.Aluno.notas).joinedload(models.Nota.disciplina),
        joinedload(models.Aluno.faltas),
        joinedload(models.Aluno.turma) 
    ).all()

    alunos_analise = [] # Lista final de alunos processados

    for aluno in alunos_db:
        # Ignorar alunos sem turma ou notas
        if not aluno.turma: continue
        
        turma_str = f"{aluno.turma.Ano}º{aluno.turma.Turma}"
        notas_finais = []
        detalhe_negativas = []
        
        # Analisar cada nota do aluno
        for n in aluno.notas:
            if n.Nota_Final is not None:
                notas_finais.append(n.Nota_Final)
                
                # Atribuir estatística ao Professor
                key_aula = (aluno.Turma_id, n.Disc_id)
                nome_prof = mapa_aulas.get(key_aula)
                
                if nome_prof and nome_prof in prof_stats:
                    prof_stats[nome_prof]["Soma_Notas"] += n.Nota_Final
                    prof_stats[nome_prof]["Qtd_Notas"] += 1
                    prof_stats[nome_prof]["Turmas"].add(turma_str)

                # Detetar Quedas Graves (P1 -> Final)
                p1 = n.Nota_1P or n.Nota_Final
                queda = n.Nota_Final - p1
                
                if n.Nota_Final < 10:
                    disc_nome = n.disciplina.Nome if n.disciplina else "Disc"
                    info_queda = f" (Caiu {abs(queda)} valores)" if queda < -2 else ""
                    detalhe_negativas.append(f"{disc_nome}: {n.Nota_Final}{info_queda} [Prof: {nome_prof or 'N/A'}]")

        # Se o aluno tiver dados relevantes, guardar
        if notas_finais:
            media = sum(notas_finais) / len(notas_finais)
            
            # Só nos interessam alunos com problemas para o relatório (Top Risco)
            if len(detalhe_negativas) >= 2 or media < 9.5:
                alunos_analise.append({
                    "Nome": aluno.Nome,
                    "Turma": turma_str,
                    "Media_Global": round(media, 2),
                    "Total_Negativas": len(detalhe_negativas),
                    "Faltas_Total": len(aluno.faltas),
                    "Disciplinas_Criticas": detalhe_negativas
                })

    # Ordenar alunos por gravidade (mais negativas primeiro)
    alunos_analise.sort(key=lambda x: x["Total_Negativas"], reverse=True)

    # --- 3. FECHAR CONTAS DOS PROFESSORES (ROI) ---
    tabela_docentes = []
    for nome, dados in prof_stats.items():
        if dados["Qtd_Notas"] > 0:
            media_prof = round(dados["Soma_Notas"] / dados["Qtd_Notas"], 2)
            
            # Lógica de Negócio (Python define a etiqueta, IA apenas lê)
            tag_roi = "Normal"
            if dados["Salario"] > 2200 and media_prof < 10:
                tag_roi = "ALERTA: Custo Elevado / Baixo Rendimento"
            elif dados["Salario"] < 1800 and media_prof > 14:
                tag_roi = "DESTAQUE: Talento (Custo Baixo / Alto Rendimento)"
            
            tabela_docentes.append({
                "Professor": nome,
                "Escalao": dados["Escalao"],
                "Salario": f"{dados['Salario']}€",
                "Media_Alunos": media_prof,
                "Tag_Gestao": tag_roi
            })
    
    tabela_docentes.sort(key=lambda x: x["Media_Alunos"])

    # --- 4. FINANÇAS SIMPLIFICADAS ---
    transacoes = db.query(models.Transacao).order_by(models.Transacao.Data.desc()).limit(15).all()
    financas = [{"Data": str(t.Data), "Tipo": t.Tipo.value, "Valor": float(t.Valor or 0), "Desc": t.Descricao} for t in transacoes]

    # RETORNO MASTIGADO
    return {
        "ANALISE_DOCENTE_PRE_CALCULADA": tabela_docentes,
        "ALUNOS_CRITICOS_TOP_15": alunos_analise[:15], # Apenas os 15 piores para poupar tokens
        "FINANCAS_RECENTES": financas
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