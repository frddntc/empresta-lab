import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Em Docker, DATABASE_URL aponta para o container PostgreSQL (compose).
# Sem ela (dev local sem Postgres), cai para arquivos SQLite em DATABASE_DIR.
DATABASE_URL = os.getenv("DATABASE_URL")


def _build_engine():
    if DATABASE_URL:
        # PostgreSQL (psycopg2): pool_pre_ping evita usar conexões fechadas
        # pelo servidor após ociosidade.
        return create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    database_dir = os.getenv("DATABASE_DIR", "data")
    os.makedirs(database_dir, exist_ok=True)
    return create_engine(
        f"sqlite:///{os.path.join(database_dir, 'estoque.db')}",
        connect_args={"check_same_thread": False},
    )


estoque_engine = _build_engine()

EstoqueSession = sessionmaker(autocommit=False, autoflush=False, bind=estoque_engine)

class EstoqueBase(DeclarativeBase):
    pass

def get_estoque_db():
    db = EstoqueSession()
    try:
        yield db
    finally:
        db.close()
