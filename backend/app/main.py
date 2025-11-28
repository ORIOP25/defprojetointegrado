from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, finances
from app.db.database import engine, Base

# --- Configuração Inicial da Base de Dados ---
# Apenas cria as tabelas se elas não existirem
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Escola API - Migração FastAPI",
    description="API de gestão escolar (Migração de Supabase para MySQL)",
    version="1.0.0"
)

# --- Configuração de CORS (Segurança do Browser) ---
origins = [
    "http://localhost:5173",    # Porta padrão do Vite
    "http://127.0.0.1:5173",
    "http://localhost:8080",    # <--- ADICIONADO: A tua porta atual
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Rotas (Endpoints) ---

# CORREÇÃO AQUI: Adicionado prefix="/auth"
# Agora a rota final fica: /auth/token (como o frontend espera)
app.include_router(auth.router, prefix="/auth", tags=["Autenticação"])

app.include_router(finances.router, prefix="/financas", tags=["Relatórios Financeiros"])

@app.get("/")
def read_root():
    return {
        "message": "API FastAPI está a correr!",
        "database": "Ligado ao MySQL (Docker)",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)