"""Migração one-shot: copia os dados dos bancos SQLite legados (volume
`empresta_db_data`) para o PostgreSQL (container `db` do compose).

Uso (a partir da raiz do projeto, com a stack no ar):

    docker run --rm --network empresta_empresta_net \
      -v empresta_db_data:/legacy:ro \
      -v "$PWD/backend:/src" -w /src \
      -e DATABASE_URL='postgresql+psycopg2://empresta:empresta_dev_password@db:5432/empresta' \
      -e SQLITE_ESTOQUE_URL='sqlite:////legacy/estoque.db' \
      -e SQLITE_EMPRESTIMOS_URL='sqlite:////legacy/emprestimos.db' \
      python:3.12-slim sh -c \
      "pip install -q sqlalchemy==2.0.35 psycopg2-binary==2.9.9 && python scripts/migrate_sqlite_to_postgres.py"

Idempotente: registros já existentes no destino (por id) são ignorados.
"""

import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database.estoque_db import EstoqueBase
from app.database.emprestimos_db import EmprestimosBase
import app.models.estoque  # noqa: F401
import app.models.emprestimos  # noqa: F401
from app.models.estoque import Equipamento
from app.models.emprestimos import Cliente, Emprestimo

SQLITE_ESTOQUE_URL = os.getenv("SQLITE_ESTOQUE_URL", "sqlite:///data/estoque.db")
SQLITE_EMPRESTIMOS_URL = os.getenv("SQLITE_EMPRESTIMOS_URL", "sqlite:///data/emprestimos.db")

pg_engine = create_engine(os.environ["DATABASE_URL"])
pg_session = sessionmaker(bind=pg_engine)()

legado_estoque = sessionmaker(bind=create_engine(SQLITE_ESTOQUE_URL))()
legado_emprestimos = sessionmaker(bind=create_engine(SQLITE_EMPRESTIMOS_URL))()

EstoqueBase.metadata.create_all(pg_engine)
EmprestimosBase.metadata.create_all(pg_engine)


def migrar(modelo, registros, chave="id"):
    inseridos = 0
    for obj in registros:
        existe = pg_session.query(modelo).filter_by(**{chave: getattr(obj, chave)}).first()
        if existe:
            continue
        dados = {c.name: getattr(obj, c.name) for c in modelo.__table__.columns}
        pg_session.add(modelo(**dados))
        inseridos += 1
    pg_session.commit()
    return inseridos


def migrar_emprestimos(registros):
    """Copia empréstimos preservando o histórico. Clientes removidos da base
    legada (regra pós-devolução) deixam cliente_id órfão no SQLite — no destino,
    a FK é imposta: esses registros entram com cliente_id NULL, mesma semântica
    produzida pela regra de remoção no PostgreSQL."""
    inseridos = 0
    for obj in registros:
        existe = pg_session.query(Emprestimo).filter_by(id=obj.id).first()
        if existe:
            continue
        dados = {c.name: getattr(obj, c.name) for c in Emprestimo.__table__.columns}
        if dados.get("cliente_id") is not None:
            cliente_existe = pg_session.query(Cliente).filter_by(id=dados["cliente_id"]).first()
            if not cliente_existe:
                dados["cliente_id"] = None
        pg_session.add(Emprestimo(**dados))
        inseridos += 1
    pg_session.commit()
    return inseridos


try:
    n_eq = migrar(Equipamento, legado_estoque.query(Equipamento).all())
    n_cli = migrar(Cliente, legado_emprestimos.query(Cliente).all())
    n_emp = migrar_emprestimos(legado_emprestimos.query(Emprestimo).order_by(Emprestimo.id).all())

    # Sequências de autoincremento ajustadas para continuar após os ids copiados.
    for tabela in ("equipamentos", "clientes", "emprestimos"):
        pg_session.execute(text(
            f"SELECT setval(pg_get_serial_sequence('{tabela}', 'id'), "
            f"COALESCE((SELECT MAX(id) FROM {tabela}), 1))"
        ))
    pg_session.commit()

    print(f"Migrado: {n_eq} equipamentos, {n_cli} clientes, {n_emp} emprestimos.")
finally:
    pg_session.close()
    legado_estoque.close()
    legado_emprestimos.close()
