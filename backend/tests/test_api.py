"""Testes de integração da API (prompt 02.6).

As fixtures de integração (TestClient + bancos in-memory + mock do Gemini)
estão definidas em conftest.py.
"""
import pytest
from app.core.config import ADMIN_USER, ADMIN_PASSWORD


def test_health(client):
    test_client, _, _ = client
    resp = test_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_login_admin_valido(client):
    test_client, _, _ = client
    resp = test_client.post("/auth/admin/login", json={"usuario": ADMIN_USER, "senha": ADMIN_PASSWORD})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_cliente_invalido(client):
    test_client, _, _ = client
    resp = test_client.post("/auth/cliente/login", json={"matricula": "RA999", "senha": "errada"})
    assert resp.status_code == 401


def test_criar_e_listar_equipamento(client):
    test_client, _, _ = client
    # Login admin
    adm = test_client.post("/auth/admin/login", json={"usuario": ADMIN_USER, "senha": ADMIN_PASSWORD})
    token = adm.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Criar
    res = test_client.post("/equipamentos", json={
        "nome": "Paquímetro", "categoria": "Medição", "quantidade": 5
    }, headers=headers)
    assert res.status_code == 201

    # Listar
    lista = test_client.get("/equipamentos", headers=headers)
    assert lista.status_code == 200
    assert len(lista.json()) == 1


def test_chat_sem_token(client):
    test_client, _, _ = client
    res = test_client.post("/chat", json={"message": "Olá", "history": []})
    # Sem o header Authorization, o HTTPBearer do FastAPI responde 403
    # ("Not authenticated"); com token inválido/expirado responde 401.
    # Em ambos os casos o acesso é bloqueado.
    assert res.status_code in (401, 403)
