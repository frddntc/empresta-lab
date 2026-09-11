from app.database.estoque_db import estoque_engine, EstoqueBase
from app.database.emprestimos_db import emprestimos_engine, EmprestimosBase

# Importar todos os modelos para registrá-los nos metadados
import app.models.estoque  # noqa: F401
import app.models.emprestimos  # noqa: F401

def init_db() -> None:
    """Cria todas as tabelas nos dois bancos SQLite, se ainda não existirem."""
    EstoqueBase.metadata.create_all(bind=estoque_engine)
    EmprestimosBase.metadata.create_all(bind=emprestimos_engine)
