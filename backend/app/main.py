from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, finances, dashboard, students, staff, ai_advisor, ai_chat
from app.db.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Escola API - Migração FastAPI",
    description="API de gestão escolar (Migração de Supabase para MySQL)",
    version="1.0.0"
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Rotas
app.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
app.include_router(finances.router, prefix="/financas", tags=["Relatórios Financeiros"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(staff.router, prefix="/staff", tags=["Gestão de Staff"])
app.include_router(staff.router, prefix="/staff", tags=["Staff"])
app.include_router(students.router, prefix="/students", tags=["Gestão de Alunos"])
app.include_router(ai_advisor.router, prefix="/ai", tags=["Assistente IA (Relatórios)"])
app.include_router(ai_chat.router, prefix="/chat", tags=["Assistente IA (Chat)"])

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