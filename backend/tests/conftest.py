import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from google.genai import types as genai_types

import app.models.estoque  # noqa: F401
import app.models.emprestimos  # noqa: F401
from app.main import app
from app.database.estoque_db import get_estoque_db, EstoqueBase
from app.database.emprestimos_db import get_emprestimos_db, EmprestimosBase
from app.models.estoque import Equipamento
from app.models.emprestimos import Cliente
from app.core.security import hash_password
from app.core.config import ADMIN_USER, ADMIN_PASSWORD


# ---------------------------------------------------------------------------
# Fixtures de sessão direta (testes de modelos)
# ---------------------------------------------------------------------------

@pytest.fixture()
def estoque_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    EstoqueBase.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    EstoqueBase.metadata.drop_all(engine)


@pytest.fixture()
def emprestimos_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    EmprestimosBase.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    EmprestimosBase.metadata.drop_all(engine)


# ---------------------------------------------------------------------------
# Fixtures de integração (prompt 02.6) — TestClient com bancos in-memory
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    """TestClient com bancos SQLite in-memory via override de dependências.

    Usa StaticPool para que todas as threads (a do pytest e a do TestClient)
    compartilhem o mesmo banco :memory:.
    """
    estoque_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    emprestimos_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    EstoqueBase.metadata.create_all(estoque_engine)
    EmprestimosBase.metadata.create_all(emprestimos_engine)

    EstoqueSessionLocal = sessionmaker(bind=estoque_engine)
    EmprestimosSessionLocal = sessionmaker(bind=emprestimos_engine)

    def override_estoque():
        db = EstoqueSessionLocal()
        try:
            yield db
        finally:
            db.close()

    def override_emprestimos():
        db = EmprestimosSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_estoque_db] = override_estoque
    app.dependency_overrides[get_emprestimos_db] = override_emprestimos

    with TestClient(app) as test_client:
        yield test_client, EstoqueSessionLocal, EmprestimosSessionLocal

    app.dependency_overrides.clear()
    EstoqueBase.metadata.drop_all(estoque_engine)
    EmprestimosBase.metadata.drop_all(emprestimos_engine)


@pytest.fixture()
def admin_headers(client):
    """Retorna headers com token Bearer de administrador."""
    test_client, _, _ = client
    resp = test_client.post("/auth/admin/login", json={"usuario": ADMIN_USER, "senha": ADMIN_PASSWORD})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def cliente_headers(client):
    """Cria um cliente no banco in-memory e retorna headers com token Bearer de cliente."""
    test_client, emprestimos_sessionmaker, _ = client
    db = emprestimos_sessionmaker()
    try:
        db.add(
            Cliente(
                nome="Maria Silva",
                email="maria@exemplo.com",
                telefone="11999990000",
                matricula="RA12345",
                senha_hash=hash_password("senha123"),
            )
        )
        db.commit()
    finally:
        db.close()

    resp = test_client.post("/auth/cliente/login", json={"matricula": "RA12345", "senha": "senha123"})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def equipamento_factory(client):
    """Cria equipamentos no estoque in-memory e devolve uma factory."""
    estoque_sessionmaker = client[1]

    def criar(nome="Multímetro", categoria="Medição", quantidade=10):
        db = estoque_sessionmaker()
        try:
            eq = Equipamento(nome=nome, categoria=categoria, quantidade=quantidade)
            db.add(eq)
            db.commit()
            db.refresh(eq)
            return eq
        finally:
            db.close()

    return criar


@pytest.fixture()
def mock_gemini():
    """Mocka o cliente do Gemini: nenhuma chamada real é feita durante os testes.

    Retorna o mock de `client.models` para que testes ajustem respostas
    (ex.: function calls) quando necessário.
    """
    with patch("app.services.chat_service.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        resposta_padrao = MagicMock(
            candidates=[
                MagicMock(
                    content=genai_types.Content(
                        role="model",
                        parts=[genai_types.Part.from_text(text="Olá! Como posso ajudar?")],
                    )
                )
            ]
        )
        mock_client.models.generate_content.return_value = resposta_padrao

        yield mock_client
