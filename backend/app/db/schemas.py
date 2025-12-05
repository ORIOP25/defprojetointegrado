from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import date

# --- Schemas de Autenticação (Token) ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    # O role é flexível (str) para aceitar 'admin', 'global_admin', 'staff', etc.
    role: Optional[str] = None

# --- Schemas de Leitura de Staff/Professor ---
class StaffDisplay(BaseModel):
    id: int
    email: EmailStr
    Nome: str
    Cargo: Optional[str] = None
    role: str

    class Config:
        from_attributes = True

class StaffCreate(BaseModel):
    Nome: str
    email: str
    Cargo: str
    role: str
    Telefone: str = ""
    Morada: str = ""

class StaffSchema(StaffCreate):
    id: int

    class Config:
        from_attributes = True


# --- Schemas de Aluno ---
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
    class Config:
        from_attributes = True

class AlunoListagem(BaseModel):
    Aluno_id: int
    Nome: str
    Data_Nasc: Optional[date] = None
    Genero: Optional[str] = None
    Turma_Desc: str  # Calculado manualmente no endpoint (students.py)
    EE_Nome: str     
    Telefone: Optional[str] = None


class AlunoUpdate(BaseModel):
    Nome: Optional[str] = None
    Data_Nasc: Optional[date] = None
    Telefone: Optional[str] = None
    Genero: Optional[str] = None
    EE_Nome: Optional[str] = None
    # Nota: Atualizar EE ou Turma requer lógica extra, focamos nos dados pessoais por agora

# --- Schemas de Finanças (Dashboard) ---
class BalancoInvestimento(BaseModel):
    id: int
    tipo_investimento: str
    ano_financiamento: int
    valor_aprovado: float
    total_receita_periodo: float
    total_despesa_periodo: float
    total_gasto_acumulado: float
    saldo_restante: float

class BalancoGeral(BaseModel):
    periodo: str 
    total_receita: float
    total_despesa: float
    saldo: float
    detalhe_investimentos: List[BalancoInvestimento] = []

# --- Schemas de IA (Estrutura Hierárquica) ---
# Esta estrutura espelha o JSON gerado pelo ai_service.py e consumido pelo Recommendations.tsx

class InsightItem(BaseModel):
    tipo: str # "positivo", "negativo", "neutro" - Define a cor do cartão no frontend
    titulo: str
    descricao: str
    sugestao: str
    # Usamos Dict[str, Any] para permitir tabelas dinâmicas (Notas vs Euros)
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