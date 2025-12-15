import enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, DECIMAL, Text, UniqueConstraint, Enum
from sqlalchemy.orm import relationship
from app.db.database import Base

# --- ENUMS (Restaurados) ---
# Estes são necessários para o finances.py e outros ficheiros funcionarem
class GeneroEnum(str, enum.Enum):
    M = "M"
    F = "F"

class TipoFuncionarioEnum(str, enum.Enum):
    Professor = "Professor"
    Staff = "Staff"

class TipoTransacaoEnum(str, enum.Enum):
    Receita = "Receita"
    Despesa = "Despesa"

class TipoOcorrenciaEnum(str, enum.Enum):
    Leve = "Leve" # Falta de material, conversa
    Grave = "Grave" # Desrespeito, perturbação
    MuitoGrave = "Muito Grave" # Agressão, Vandalismo

# --- Tabelas de Estrutura ---

class Departamento(Base):
    __tablename__ = "Departamentos"
    Depart_id = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(50), nullable=False)
    professores = relationship("Professor", back_populates="departamento")
    staff = relationship("Staff", back_populates="departamento")

class Escalao(Base):
    __tablename__ = "Escaloes"
    Escalao_id = Column(Integer, primary_key=True)
    Nome = Column(String(10), nullable=False)
    Descricao = Column(String(100))
    Valor_Base = Column(DECIMAL(8, 2), nullable=False)
    Bonus = Column(DECIMAL(8, 2), default=0.00)
    professores = relationship("Professor", back_populates="escalao")

class Disciplina(Base):
    __tablename__ = "Disciplinas"
    Disc_id = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(50), nullable=False)
    Categoria = Column(String(30))

# --- Staff e Professores (ONDE ESTÁ O LOGIN) ---

class Staff(Base):
    __tablename__ = "Staff"
    Staff_id = Column(Integer, primary_key=True, index=True)
    
    # Auth Fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="staff")

    Nome = Column(String(50), nullable=False)
    Cargo = Column(String(100))
    Depart_id = Column(Integer, ForeignKey("Departamentos.Depart_id"))
    Telefone = Column(String(9))
    Morada = Column(String(100))
    Salario = Column(DECIMAL(8, 2), nullable=True)
    Escalao = Column(String(50), nullable=True)

    departamento = relationship("Departamento", back_populates="staff")

class Professor(Base):
    __tablename__ = "Professores"
    Professor_id = Column(Integer, primary_key=True, index=True)
    
    # Auth Fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="professor")

    Nome = Column(String(50), nullable=False)
    Data_Nasc = Column(Date, nullable=False)
    Telefone = Column(String(9))
    Morada = Column(String(100))
    Escalao_id = Column(Integer, ForeignKey("Escaloes.Escalao_id"))
    Depart_id = Column(Integer, ForeignKey("Departamentos.Depart_id"))

    escalao = relationship("Escalao", back_populates="professores")
    departamento = relationship("Departamento", back_populates="professores")
    turmas_diretor = relationship("Turma", back_populates="diretor_turma")

    atribuicoes = relationship("TurmaDisciplina", back_populates="professor")

# --- Alunos e Turmas ---

class Turma(Base):
    __tablename__ = "Turmas"
    Turma_id = Column(Integer, primary_key=True, index=True)
    Ano = Column(Integer, nullable=False)
    Turma = Column(String(1), nullable=False)
    AnoLetivo = Column(String(9), nullable=False)
    DiretorT = Column(Integer, ForeignKey("Professores.Professor_id"))
    
    diretor_turma = relationship("Professor", back_populates="turmas_diretor")
    alunos = relationship("Aluno", back_populates="turma_obj")

    disciplinas_associadas = relationship("TurmaDisciplina", back_populates="turma")

    __table_args__ = (UniqueConstraint('Ano', 'Turma', 'AnoLetivo', name='_ano_turma_uc'),)

class EncarregadoEducacao(Base):
    __tablename__ = "EncarregadoEducacao"
    EE_id = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(50), nullable=False)
    Telefone = Column(String(9))
    Email = Column(String(50))
    Morada = Column(String(100))
    Relacao = Column(String(20))
    educandos = relationship("Aluno", back_populates="encarregado_educacao")

class Aluno(Base):
    __tablename__ = "Alunos"
    Aluno_id = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(50), nullable=False)
    Data_Nasc = Column(Date, nullable=False)
    Telefone = Column(String(9))
    Morada = Column(String(100))
    # Usamos o Enum definido em cima
    Genero = Column(Enum(GeneroEnum), nullable=False) 
    Ano = Column(Integer, nullable=False)
    Turma_id = Column(Integer, ForeignKey("Turmas.Turma_id"))
    Escalao = Column(String(1))
    EE_id = Column(Integer, ForeignKey("EncarregadoEducacao.EE_id"))

    turma_obj = relationship("Turma", back_populates="alunos")
    encarregado_educacao = relationship("EncarregadoEducacao", back_populates="educandos")
    notas = relationship("Nota", back_populates="aluno")

    faltas = relationship("Falta", back_populates="aluno")
    ocorrencias = relationship("Ocorrencia", back_populates="aluno")

class Falta(Base):
    __tablename__ = "Faltas"
    Falta_id = Column(Integer, primary_key=True, index=True)
    Aluno_id = Column(Integer, ForeignKey("Alunos.Aluno_id"))
    Disc_id = Column(Integer, ForeignKey("Disciplinas.Disc_id")) # Saber a que aula faltou
    Data = Column(Date, nullable=False)
    Justificada = Column(Boolean, default=False)
    
    aluno = relationship("Aluno", back_populates="faltas")
    disciplina = relationship("Disciplina")

class Ocorrencia(Base):
    __tablename__ = "Ocorrencias"
    Ocorrencia_id = Column(Integer, primary_key=True, index=True)
    Aluno_id = Column(Integer, ForeignKey("Alunos.Aluno_id"))
    Professor_id = Column(Integer, ForeignKey("Professores.Professor_id")) # Quem reportou
    Data = Column(Date, nullable=False)
    Tipo = Column(Enum(TipoOcorrenciaEnum), default=TipoOcorrenciaEnum.Leve)
    Descricao = Column(Text) # "Atirou giz ao colega" - Ouro para a IA ler
    
    aluno = relationship("Aluno", back_populates="ocorrencias")
    professor = relationship("Professor")

class TurmaDisciplina(Base):
    __tablename__ = "TurmasDisciplinas"
    Turma_id = Column(Integer, ForeignKey("Turmas.Turma_id"), primary_key=True)
    Disc_id = Column(Integer, ForeignKey("Disciplinas.Disc_id"), primary_key=True)
    Professor_id = Column(Integer, ForeignKey("Professores.Professor_id"), primary_key=True)

    turma = relationship("Turma", back_populates="disciplinas_associadas")
    disciplina = relationship("Disciplina") # Unidirecional chega
    professor = relationship("Professor", back_populates="atribuicoes")

class Nota(Base):
    __tablename__ = "Notas"
    Nota_id = Column(Integer, primary_key=True, index=True)
    Aluno_id = Column(Integer, ForeignKey("Alunos.Aluno_id"))
    Disc_id = Column(Integer, ForeignKey("Disciplinas.Disc_id"))
    Nota_1P = Column(Integer)
    Nota_2P = Column(Integer)
    Nota_3P = Column(Integer)
    Nota_Ex = Column(Integer)
    Nota_Final = Column(Integer)
    Ano_letivo = Column(String(9))

    aluno = relationship("Aluno", back_populates="notas")
    disciplina = relationship("Disciplina")

# --- Finanças ---

class Financiamento(Base):
    __tablename__ = "Financiamentos"
    Fin_id = Column(Integer, primary_key=True, index=True)
    Tipo = Column(String(50))
    Valor = Column(DECIMAL(10, 2))
    Ano = Column(Integer)
    Observacoes = Column(Text)

class Fornecedor(Base):
    __tablename__ = "Fornecedores"
    Fornecedor_id = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(50), nullable=False)
    NIF = Column(String(9), unique=True)
    Tipo = Column(String(30))
    Telefone = Column(String(9))
    Email = Column(String(50))
    Morada = Column(String(100))
    IBAN = Column(String(25))
    Observacoes = Column(Text)

class Transacao(Base):
    __tablename__ = "Transacoes"
    Transacao_id = Column(Integer, primary_key=True, index=True)
    # Usamos o Enum definido em cima
    Tipo = Column(Enum(TipoTransacaoEnum), nullable=False)
    Valor = Column(DECIMAL(10, 2))
    Data = Column(Date)
    Descricao = Column(Text)
    Fin_id = Column(Integer, ForeignKey("Financiamentos.Fin_id"))
    Fornecedor_id = Column(Integer, ForeignKey("Fornecedores.Fornecedor_id"))

    financiamento = relationship("Financiamento")
    fornecedor = relationship("Fornecedor")

class Ordenado(Base):
    __tablename__ = "Ordenados"
    Ordenado_id = Column(Integer, primary_key=True, index=True)
    Funcionario_id = Column(Integer, nullable=False)
    # Usamos o Enum definido em cima
    Tipo_Funcionario = Column(Enum(TipoFuncionarioEnum), nullable=False)
    Mes = Column(String(15))
    Ano = Column(Integer)
    Valor = Column(DECIMAL(8, 2))
    Data_Pagamento = Column(Date)
    Observacoes = Column(Text)

class AIRecommendation(Base):
    __tablename__ = "AI_Recommendation"
    AI_id = Column(Integer, primary_key=True, index=True)
    Texto = Column(Text, nullable=False)