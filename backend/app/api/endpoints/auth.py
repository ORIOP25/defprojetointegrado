from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.db.database import get_db
from app.db.models import Staff, Professor 
from app.db.schemas import Token

router = APIRouter()

@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    # 1. Tentar encontrar em STAFF
    user = db.query(Staff).filter(Staff.email == form_data.username).first()
    user_type = "staff"

    # 2. Se não encontrar, tentar em PROFESSORES
    if not user:
        user = db.query(Professor).filter(Professor.email == form_data.username).first()
        user_type = "professor"

    # 3. Verificar credenciais
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou password incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Gerar Token com a ROLE correta (vem da BD)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.email,
        role=user.role, # Apanha 'global_admin', 'staff' ou 'professor'
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }