from pydantic import BaseModel, EmailStr
from typing import Optional, List
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

# --- Schemas de Finanças (Dashboard) ---
class BalancoGeral(BaseModel):
    periodo: str 
    total_receita: float
    total_despesa: float
    saldo: float