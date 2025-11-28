from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# 1. Criar o Engine do SQLAlchemy
# O pool_pre_ping ajuda a evitar erros de conexão perdida (frequente em MySQL)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True
)

# 2. Criar a classe SessionLocal
# Cada pedido à API vai usar uma instância desta classe
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Criar a Classe Base para os Modelos
# Todos os modelos (tabelas) vão herdar desta classe
Base = declarative_base()

# 4. Dependência para injetar a DB nas rotas (Dependency Injection)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()