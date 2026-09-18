"""Testes de integração da API (prompt 02.6).

As fixtures de integração (TestClient + bancos in-memory + mock do Gemini)
estão definidas em conftest.py.
"""
import pytest
from app.core.config import ADMIN_USER, ADMIN_PASSWORD
from app.models.emprestimos import Cliente


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


def test_listar_emprestimos_inclui_dados_do_cliente(client, admin_headers, equipamento_factory, cliente_headers):
    """A listagem de empréstimos ativos traz os dados fornecidos pelo cliente
    (nome, email, telefone, matrícula) — sem expor a senha."""
    test_client, _, _ = client
    eq = equipamento_factory(nome="Paquímetro", quantidade=5)

    # Registrar cliente e criar um empréstimo via API (fluxo do chat/painel).
    test_client.post(
        "/auth/cliente/register",
        json={
            "nome": "Carlos Almeida",
            "email": "carlos@exemplo.com",
            "telefone": "11977770000",
            "matricula": "RA555",
            "senha": "senha123",
        },
    )
    criado = test_client.post(
        "/emprestimos",
        json={"equipamento_id": eq.id, "quantidade": 1, "nome": "Carlos Almeida",
              "email": "carlos@exemplo.com", "telefone": "11977770000",
              "matricula": "RA555", "prazo_dias": 7},
        headers=admin_headers,
    )
    assert criado.status_code == 201
    assert criado.json()["cliente"]["nome"] == "Carlos Almeida"
    assert "senha_hash" not in criado.json()["cliente"]

    lista = test_client.get("/emprestimos", headers=admin_headers)
    assert lista.status_code == 200
    registro = next(e for e in lista.json() if e["id"] == criado.json()["id"])
    assert registro["cliente"] == {
        "id": registro["cliente_id"],
        "nome": "Carlos Almeida",
        "email": "carlos@exemplo.com",
        "telefone": "11977770000",
        "matricula": "RA555",
    }


def test_devolucao_mantem_cliente_na_base(client, admin_headers, equipamento_factory):
    """O cadastro do cliente é permanente: após a devolução ele continua na base,
    com login ativo e o mesmo ID (chave de identificação vitalícia)."""
    test_client, _, emprestimos_sessionmaker = client
    eq = equipamento_factory(nome="Osciloscópio", quantidade=3)

    test_client.post(
        "/auth/cliente/register",
        json={
            "nome": "Paulo Visitante",
            "email": "paulo@exemplo.com",
            "telefone": "11966660000",
            "matricula": "RA777",
            "senha": "senha123",
        },
    )

    def criar_emprestimo() -> int:
        r = test_client.post(
            "/emprestimos",
            json={"equipamento_id": eq.id, "quantidade": 1, "nome": "Paulo Visitante",
                  "email": "paulo@exemplo.com", "telefone": "11966660000",
                  "matricula": "RA777", "prazo_dias": 5},
            headers=admin_headers,
        )
        assert r.status_code == 201
        return r.json()["id"]

    e1, e2 = criar_emprestimo(), criar_emprestimo()
    cliente_id = (
        test_client.get("/emprestimos", headers=admin_headers).json()[0]["cliente_id"]
    )

    # Devoluções: o cliente permanece cadastrado em todas as fases.
    for eid in (e1, e2):
        r = test_client.put(f"/emprestimos/{eid}/devolver", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["cliente"] is not None
        assert r.json()["cliente"]["matricula"] == "RA777"

    # Login continua ativo após as devoluções (cadastro permanente).
    assert test_client.post(
        "/auth/cliente/login", json={"matricula": "RA777", "senha": "senha123"}
    ).status_code == 200

    # Mesmo ID de antes das devoluções — identificação vitalícia.
    db = emprestimos_sessionmaker()
    try:
        persistido = db.query(Cliente).filter_by(matricula="RA777").first()
        assert persistido is not None and persistido.id == cliente_id
    finally:
        db.close()


def test_token_expira_em_15_minutos():
    """Tokens expiram em 15 minutos (padrão): inatividade exige novo login."""
    from datetime import datetime, timezone
    from app.core.security import create_token, decode_token
    from app.core.config import JWT_EXPIRE_MINUTES

    assert JWT_EXPIRE_MINUTES == 15
    token = create_token(sub="RA123", role="cliente")
    payload = decode_token(token)
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    agora = datetime.now(timezone.utc)
    assert 14 <= (exp - agora).total_seconds() / 60 <= 15


def test_meus_emprestimos_ativos(client, admin_headers, cliente_headers, equipamento_factory):
    """/emprestimos/me retorna apenas os empréstimos ATIVOS do próprio cliente
    autenticado; exige role=cliente e token válido."""
    test_client, _, _ = client
    eq = equipamento_factory(nome="Multímetro", quantidade=5)

    # cliente_headers cria e autentica o cliente RA12345 (Maria Silva).
    criado = test_client.post(
        "/emprestimos",
        json={"equipamento_id": eq.id, "quantidade": 2, "nome": "Maria Silva",
              "email": "maria@exemplo.com", "telefone": "11999990000",
              "matricula": "RA12345", "prazo_dias": 10},
        headers=admin_headers,
    )
    assert criado.status_code == 201

    # Sem token -> 403 (padrao do HTTPBearer); admin -> 403 (rota so de clientes).
    assert test_client.get("/emprestimos/me").status_code == 403
    assert test_client.get("/emprestimos/me", headers=admin_headers).status_code == 403

    meus = test_client.get("/emprestimos/me", headers=cliente_headers)
    assert meus.status_code == 200
    assert len(meus.json()) == 1
    emp = meus.json()[0]
    assert emp["nome_equipamento"] == "Multímetro"
    assert emp["cliente"]["matricula"] == "RA12345"
    assert emp["devolvido"] is False
