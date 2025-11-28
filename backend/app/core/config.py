from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Configurações da aplicação carregadas das variáveis de ambiente.
    """
    # Configurações da Base de Dados
    DATABASE_URL: str

    # Configurações de Segurança (JWT)
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Configuração para ler o ficheiro .env
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()