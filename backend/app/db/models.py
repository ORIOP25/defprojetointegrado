import enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, DECIMAL, Text, Enum
from sqlalchemy.orm import relationship
from app.db.database import Base

# --- ENUMS ---
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
    Leve = "Leve" 
    Grave = "Grave" 
    MuitoGrave = "Muito Grave" 

# --- Tabelas de Estrutura ---

class Departamento(Base):
    __tablename__ = "Departamentos"
    Depart_id = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(100), nullable=False) # Adicionado length
    
    professores = relationship("Professor", back_populates="departamento")
    staff = relationship("Staff", back_populates="departamento")

class Escalao(Base):
    __tablename__ = "Escaloes"
    Escalao_id = Column(Integer, primary_key=True)
    Nome = Column(String(50), nullable=False) # Aumentado e definido
    Descricao = Column(String(255)) # Adicionado length
    Valor_Base = Column(DECIMAL(8, 2), nullable=False)
    Bonus = Column(DECIMAL(8, 2), default=0.00)
    
    professores = relationship("Professor", back_populates="escalao")

class Disciplina(Base):
    __tablename__ = "Disciplinas"
    Disc_id = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(100), nullable=False) # Adicionado length
    Categoria = Column(String(50)) # Adicionado length

# --- Staff e Professores ---

class Staff(Base):
    __tablename__ = "Staff"
    Staff_id = Column(Integer, primary_key=True, index=True)
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="staff")

    Nome = Column(String(255), nullable=False) # Adicionado length
    Cargo = Column(String(100))
    Depart_id = Column(Integer, ForeignKey("Departamentos.Depart_id"))
    Telefone = Column(String(20))
    Morada = Column(String(255))
    Salario = Column(DECIMAL(8, 2), nullable=True)
    Escalao = Column(String(50), nullable=True)

    departamento = relationship("Departamento", back_populates="staff")

class Professor(Base):
    __tablename__ = "Professores"
    Professor_id = Column(Integer, primary_key=True, index=True)
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="professor")

    Nome = Column(String(255), nullable=False) # Adicionado length
    Data_Nasc = Column(Date, nullable=False)
    Telefone = Column(String(20))
    Morada = Column(String(255))
    Escalao_id = Column(Integer, ForeignKey("Escaloes.Escalao_id"))
    Depart_id = Column(Integer, ForeignKey("Departamentos.Depart_id"))

    escalao = relationship("Escalao", back_populates="professores")
    departamento = relationship("Departamento", back_populates="professores")
    turmas_diretor = relationship("Turma", back_populates="diretor_turma")
    atribuicoes = relationship("TurmaDisciplina", back_populates="professor")

# --- Alunos e Turmas ---

class Turma(Base):
    __tablename__ = "turmas"
    Turma_id = Column(Integer, primary_key=True, index=True)
    Ano = Column(Integer)
    Turma = Column(String(10)) # <--- O ERRO ESTAVA AQUI (Adicionado length)
    AnoLetivo = Column(String(20)) # <--- E AQUI
    DiretorT = Column(Integer, ForeignKey("Professores.Professor_id"), nullable=True)
    
    diretor_turma = relationship("Professor", back_populates="turmas_diretor")
    matriculas = relationship("Matricula", back_populates="turma")
    disciplinas_associadas = relationship("TurmaDisciplina", back_populates="turma")

class EncarregadoEducacao(Base):
    __tablename__ = "EncarregadoEducacao"
    EE_id = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(255), nullable=False)
    Telefone = Column(String(20))
    Email = Column(String(255))
    Morada = Column(String(255))
    Relacao = Column(String(50))
    
    educandos = relationship("Aluno", back_populates="encarregado_educacao")

class Aluno(Base):
    __tablename__ = "alunos"
    Aluno_id = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(255)) # Adicionado length
    Data_Nasc = Column(String(20)) # Adicionado length (embora Date fosse melhor, mantive String para compatibilidade)
    Telefone = Column(String(20)) # Adicionado campo Telefone que faltava no teu model original mas usas no populate
    Morada = Column(String(255)) # Adicionado Morada que usas no populate
    Genero = Column(Enum(GeneroEnum), default=GeneroEnum.M) # Ajustado para Enum ou String(10)
    Foto = Column(String(255), nullable=True) # Adicionado length
    
    Turma_id = Column(Integer, ForeignKey("turmas.Turma_id")) 
    Enc_Educacao_id = Column(Integer, ForeignKey("EncarregadoEducacao.EE_id"))
    
    # Campo extra que tinhas no populate mas não no model
    Escalao = Column(String(10), nullable=True) 
    # Campo Ano que usas no frontend
    Ano = Column(Integer)

    turma = relationship("Turma") 
    encarregado_educacao = relationship("EncarregadoEducacao", back_populates="educandos")
    notas = relationship("Nota", back_populates="aluno")
    faltas = relationship("Falta", back_populates="aluno")
    ocorrencias = relationship("Ocorrencia", back_populates="aluno")
    matriculas = relationship("Matricula", back_populates="aluno")

class Matricula(Base):
    __tablename__ = "matriculas"
    
    Matricula_id = Column(Integer, primary_key=True, index=True)
    Aluno_id = Column(Integer, ForeignKey("alunos.Aluno_id"))
    Turma_id = Column(Integer, ForeignKey("turmas.Turma_id"))
    
    aluno = relationship("Aluno", back_populates="matriculas")
    turma = relationship("Turma", back_populates="matriculas")

class Falta(Base):
    __tablename__ = "Faltas"
    Falta_id = Column(Integer, primary_key=True, index=True)
    Aluno_id = Column(Integer, ForeignKey("alunos.Aluno_id"))
    Disc_id = Column(Integer, ForeignKey("Disciplinas.Disc_id"))
    Data = Column(Date, nullable=False)
    Justificada = Column(Boolean, default=False)
    
    aluno = relationship("Aluno", back_populates="faltas")
    disciplina = relationship("Disciplina")

class Ocorrencia(Base):
    __tablename__ = "Ocorrencias"
    Ocorrencia_id = Column(Integer, primary_key=True, index=True)
    Aluno_id = Column(Integer, ForeignKey("alunos.Aluno_id"))
    Professor_id = Column(Integer, ForeignKey("Professores.Professor_id"))
    Data = Column(Date, nullable=False)
    Tipo = Column(Enum(TipoOcorrenciaEnum), default=TipoOcorrenciaEnum.Leve)
    Descricao = Column(Text) # Text não precisa de length no MySQL
    
    aluno = relationship("Aluno", back_populates="ocorrencias")
    professor = relationship("Professor")

class TurmaDisciplina(Base):
    __tablename__ = "TurmasDisciplinas"
    Turma_id = Column(Integer, ForeignKey("turmas.Turma_id"), primary_key=True)
    Disc_id = Column(Integer, ForeignKey("Disciplinas.Disc_id"), primary_key=True)
    Professor_id = Column(Integer, ForeignKey("Professores.Professor_id"), primary_key=True)

    turma = relationship("Turma", back_populates="disciplinas_associadas")
    disciplina = relationship("Disciplina")
    professor = relationship("Professor", back_populates="atribuicoes")

class Nota(Base):
    __tablename__ = "Notas"
    Nota_id = Column(Integer, primary_key=True, index=True)
    Aluno_id = Column(Integer, ForeignKey("alunos.Aluno_id"))
    Disc_id = Column(Integer, ForeignKey("Disciplinas.Disc_id"))
    Nota_1P = Column(Integer)
    Nota_2P = Column(Integer)
    Nota_3P = Column(Integer)
    Nota_Ex = Column(Integer)
    Nota_Final = Column(Integer)
    Ano_letivo = Column(String(20)) # Adicionado length

    aluno = relationship("Aluno", back_populates="notas")
    disciplina = relationship("Disciplina")

# --- Finanças ---

class Financiamento(Base):
    __tablename__ = "Financiamentos"
    Fin_id = Column(Integer, primary_key=True, index=True)
    Tipo = Column(String(100)) # Adicionado length
    Valor = Column(DECIMAL(10, 2))
    Ano = Column(Integer)
    Observacoes = Column(Text)

class Fornecedor(Base):
    __tablename__ = "Fornecedores"
    Fornecedor_id = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(100), nullable=False)
    NIF = Column(String(20), unique=True)
    Tipo = Column(String(100))
    Telefone = Column(String(20))
    Email = Column(String(100))
    Morada = Column(String(255))
    IBAN = Column(String(50))
    Observacoes = Column(Text)

class Transacao(Base):
    __tablename__ = "Transacoes"
    Transacao_id = Column(Integer, primary_key=True, index=True)
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
    Tipo_Funcionario = Column(Enum(TipoFuncionarioEnum), nullable=False)
    Mes = Column(String(20)) # Adicionado length
    Ano = Column(Integer)
    Valor = Column(DECIMAL(8, 2))
    Data_Pagamento = Column(Date)
    Observacoes = Column(Text)

class AIRecommendation(Base):
    __tablename__ = "AI_Recommendation"
    AI_id = Column(Integer, primary_key=True, index=True)
    Texto = Column(Text, nullable=False)