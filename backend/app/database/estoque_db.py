import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_DIR = os.getenv("DATABASE_DIR", "data")
os.makedirs(DATABASE_DIR, exist_ok=True)

ESTOQUE_DATABASE_URL = f"sqlite:///{os.path.join(DATABASE_DIR, 'estoque.db')}"

estoque_engine = create_engine(
    ESTOQUE_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

EstoqueSession = sessionmaker(autocommit=False, autoflush=False, bind=estoque_engine)

class EstoqueBase(DeclarativeBase):
    pass

def get_estoque_db():
    db = EstoqueSession()
    try:
        yield db
    finally:
        db.close()
