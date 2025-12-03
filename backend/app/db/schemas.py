from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
from datetime import date

# --- Schemas de Autenticação (Token) ---
class Token(BaseModel):
    access_token: str
    token_type: str
    # Nota: Removemos 'user_email' e 'is_staff' porque essa info 
    # agora viaja encriptada DENTRO do access_token (JWT).

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# --- Schemas de Leitura de Staff/Professor (Para substituir o antigo User) ---
# Usaremos isto na Fase 3 para mostrar os dados no perfil
class StaffDisplay(BaseModel):
    id: int
    email: EmailStr
    Nome: str
    Cargo: Optional[str] = None
    role: str

    class Config:
        from_attributes = True

# --- Schemas de Aluno (Para a Fase 3) ---
class AlunoBase(BaseModel):
    Nome: str
    Data_Nasc: Optional[date] = None
    Telefone: Optional[str] = None
    Morada: Optional[str] = None

class AlunoCreate(AlunoBase):
    Turma_id: Optional[int] = None
    EE_id: Optional[int] = None
    Genero: str
    Ano: int

class AlunoDisplay(AlunoBase):
    Aluno_id: int
    # Podes adicionar mais campos aqui conforme necessário

    class Config:
        from_attributes = True

class AlunoListagem(BaseModel):
    Aluno_id: int
    Nome: str
    Data_Nasc: Optional[date] = None
    Genero: Optional[str] = None
    Turma_Desc: str  # Campo calculado (ex: "10º A" ou "Sem Turma")
    EE_Nome: str     # Campo calculado (ex: "Nome do Pai" ou "N/A")
    Telefone: Optional[str] = None


class AlunoUpdate(BaseModel):
    Nome: Optional[str] = None
    Data_Nasc: Optional[date] = None
    Telefone: Optional[str] = None
    Genero: Optional[str] = None
    EE_Nome: Optional[str] = None
    # Nota: Atualizar EE ou Turma requer lógica extra, focamos nos dados pessoais por agora

# --- Schemas de Finanças (Dashboard) ---

# 1. Schema para o detalhe de cada linha (Lab, Projeto, etc.)
class BalancoInvestimento(BaseModel):
    id: int
    tipo_investimento: str
    ano_financiamento: int
    valor_aprovado: float
    total_receita_periodo: float
    total_despesa_periodo: float
    total_gasto_acumulado: float
    saldo_restante: float

# 2. Schema Geral (O Pai) que inclui a lista dos filhos
class BalancoGeral(BaseModel):
    periodo: str 
    total_receita: float
    total_despesa: float
    saldo: float
    # Adicionamos este campo para o frontend receber a lista detalhada
    detalhe_investimentos: List[BalancoInvestimento] = []


# --- Schemas de IA / Recomendações ---
class RecomendacaoIA(BaseModel):
    id: int
    titulo: str
    descricao: str
    area: str       # Ex: "Financeira", "Pedagógica", "Staff"
    prioridade: str # Ex: "Alta", "Média", "Baixa"
    acao_sugerida: Optional[str] = None

class InsightDetalhe(BaseModel):
    # Aceita qualquer chave/valor para a tabela ser dinâmica
    # Ex: {"Aluno": "João", "Nota": 10}
    class Config:
        extra = "allow" 

class InsightItem(BaseModel):
    tipo: str # "positivo", "negativo", "neutro"
    titulo: str
    descricao: str
    sugestao: str
    # Uma lista de dicionários para a tabela
    detalhes: List[Dict[str, Any]] = []

class CategoriaInsight(BaseModel):
    categoria: str
    cor: str # "blue", "green", "red"
    insights: List[InsightItem]

# --- Schemas para o Chatbot ---
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class NotaBase(BaseModel):
    Disc_id: int
    Nota_1P: Optional[int] = None
    Nota_2P: Optional[int] = None
    Nota_3P: Optional[int] = None
    Nota_Ex: Optional[int] = None
    Nota_Final: Optional[int] = None
    Ano_letivo: str

class NotaCreate(NotaBase):
    pass

class NotaDisplay(NotaBase):
    Nota_id: int
    # Para mostrar o nome da disciplina em vez de só o ID
    Disciplina_Nome: Optional[str] = "Disciplina Desconhecida"

    class Config:
        from_attributes = True

# Schema para Atualizar Nota (Campos opcionais)
class NotaUpdate(BaseModel):
    Nota_1P: Optional[int] = None
    Nota_2P: Optional[int] = None
    Nota_3P: Optional[int] = None
    Nota_Ex: Optional[int] = None
    Nota_Final: Optional[int] = None

# Schema simples para o Dropdown de Disciplinas
class DisciplinaSimple(BaseModel):
    Disc_id: int
    Nome: str
    class Config:
        from_attributes = True