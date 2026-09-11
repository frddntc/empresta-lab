import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_DIR = os.getenv("DATABASE_DIR", "data")
os.makedirs(DATABASE_DIR, exist_ok=True)

EMPRESTIMOS_DATABASE_URL = f"sqlite:///{os.path.join(DATABASE_DIR, 'emprestimos.db')}"

emprestimos_engine = create_engine(
    EMPRESTIMOS_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

EmprestimosSession = sessionmaker(autocommit=False, autoflush=False, bind=emprestimos_engine)

class EmprestimosBase(DeclarativeBase):
    pass

def get_emprestimos_db():
    db = EmprestimosSession()
    try:
        yield db
    finally:
        db.close()
