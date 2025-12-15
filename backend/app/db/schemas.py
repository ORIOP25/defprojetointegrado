from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict, Any, Optional
from datetime import date

# --- Schemas de Autenticação (Token) ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
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

class AlunoCreateFull(BaseModel):
    # Dados Aluno
    Nome: str = Field(..., min_length=1, description="Nome não pode estar vazio")
    Data_Nasc: date
    Genero: str
    Telefone: Optional[str] = None
    Ano: int
    Turma_Letra: str
    
    # Dados EE - AGORA COM VALIDAÇÃO DE TAMANHO MÍNIMO
    EE_Nome: str = Field(..., min_length=1, description="Nome do EE obrigatório")
    EE_Telefone: str = Field(..., min_length=9, description="Telefone inválido")
    EE_Email: str = Field(..., min_length=3, description="Email obrigatório")
    EE_Morada: str = Field(..., min_length=3, description="Morada obrigatória")
    EE_Relacao: str = Field(..., min_length=2, description="Relação obrigatória")

class AlunoDisplay(AlunoBase):
    Aluno_id: int
    class Config:
        from_attributes = True

# --- ATUALIZAÇÃO PARA ALUNOS E EE ---

class AlunoListagem(BaseModel):
    Aluno_id: int
    Nome: str
    Data_Nasc: Optional[date] = None
    Genero: Optional[str] = None
    Turma_Desc: str
    Turma_Ano: Optional[int] = None    # Para edição
    Turma_Letra: Optional[str] = None  # Para edição
    Telefone: Optional[str] = None
    
    # Dados EE (Na listagem podem vir vazios se a base de dados tiver registos antigos)
    EE_Nome: str
    EE_Telefone: Optional[str] = None
    EE_Email: Optional[str] = None
    EE_Morada: Optional[str] = None
    EE_Relacao: Optional[str] = None


class AlunoUpdate(BaseModel):
    Nome: Optional[str] = None
    Data_Nasc: Optional[date] = None
    Telefone: Optional[str] = None
    Genero: Optional[str] = None
    
    # Campos para mudança de turma
    Ano: Optional[int] = None
    Turma_Letra: Optional[str] = None
    
    # Campos para atualização do EE
    EE_Nome: Optional[str] = None
    EE_Telefone: Optional[str] = None
    EE_Email: Optional[str] = None
    EE_Morada: Optional[str] = None
    EE_Relacao: Optional[str] = None

# Schema simples para listar Turmas no Dropdown
class TurmaSimple(BaseModel):
    Turma_id: int
    Ano: int
    Turma: str
    class Config:
        from_attributes = True

# --- Schemas de Notas ---

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

class NotaUpdate(BaseModel):
    Nota_1P: Optional[int] = None
    Nota_2P: Optional[int] = None
    Nota_3P: Optional[int] = None
    Nota_Ex: Optional[int] = None
    Nota_Final: Optional[int] = None

class NotaDisplay(NotaBase):
    Nota_id: int
    Disciplina_Nome: Optional[str] = "Disciplina Desconhecida"

    class Config:
        from_attributes = True

class DisciplinaSimple(BaseModel):
    Disc_id: int
    Nome: str
    class Config:
        from_attributes = True

# --- SCHEMAS DE STAFF ---

class StaffBase(BaseModel):
    Nome: str
    Email: EmailStr
    Telefone: Optional[str] = None
    Morada: Optional[str] = None
    Cargo: str
    Departamento: Optional[str] = None
    Role: Optional[str] = "staff"
    Salario: Optional[float] = 0.0
    Escalao: Optional[str] = None

class StaffCreate(StaffBase):
    pass

class StaffUpdate(BaseModel):
    Nome: Optional[str] = None
    Email: Optional[EmailStr] = None
    Telefone: Optional[str] = None
    Morada: Optional[str] = None
    Cargo: Optional[str] = None
    Departamento: Optional[str] = None
    Role: Optional[str] = None
    Salario: Optional[float] = None
    Escalao: Optional[str] = None

class StaffListagem(StaffBase):
    Staff_id: int

    class Config:
        orm_mode = True

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

# --- Schemas de IA / Recomendações ---
class RecomendacaoIA(BaseModel):
    id: int
    titulo: str
    descricao: str
    area: str       
    prioridade: str 
    acao_sugerida: Optional[str] = None

class InsightDetalhe(BaseModel):
    class Config:
        extra = "allow" 

class InsightItem(BaseModel):
    tipo: str
    titulo: str
    descricao: str
    sugestao: str
    detalhes: List[Dict[str, Any]] = []

class CategoriaInsight(BaseModel):
    categoria: str
    cor: str
    insights: List[InsightItem]

# --- Schemas para o Chatbot ---
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str