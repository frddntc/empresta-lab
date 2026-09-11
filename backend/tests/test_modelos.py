from datetime import date, timedelta
import pytest
from sqlalchemy.exc import IntegrityError
from app.models.estoque import Equipamento
from app.models.emprestimos import Cliente, Emprestimo


# ---------------------------------------------------------------------------
# Testes do modelo Equipamento (estoque.db)
# ---------------------------------------------------------------------------

def test_criacao_equipamento(estoque_session):
    """Verifica que um equipamento pode ser inserido e recuperado com todos os campos."""
    eq = Equipamento(
        nome="Paquímetro",
        descricao="Instrumento de medição",
        categoria="Medição",
        quantidade=5,
    )
    estoque_session.add(eq)
    estoque_session.commit()

    recuperado = estoque_session.query(Equipamento).filter_by(nome="Paquímetro").first()
    assert recuperado is not None
    assert recuperado.categoria == "Medição"
    assert recuperado.quantidade == 5


def test_quantidade_negativa_invalida(estoque_session):
    """Verifica que quantidade < 0 levanta IntegrityError."""
    eq = Equipamento(nome="Teste", categoria="Medição", quantidade=-1)
    estoque_session.add(eq)
    with pytest.raises(IntegrityError):
        estoque_session.commit()


# ---------------------------------------------------------------------------
# Testes do modelo Cliente (emprestimos.db)
# ---------------------------------------------------------------------------

def test_criacao_cliente(emprestimos_session):
    """Verifica que um cliente pode ser inserido e recuperado com todos os campos incluindo senha_hash."""
    cliente = Cliente(
        nome="Maria Silva",
        email="maria@exemplo.com",
        telefone="11999990000",
        matricula="RA12345",
        senha_hash="hash_teste_123",
    )
    emprestimos_session.add(cliente)
    emprestimos_session.commit()

    recuperado = emprestimos_session.query(Cliente).filter_by(matricula="RA12345").first()
    assert recuperado is not None
    assert recuperado.nome == "Maria Silva"
    assert recuperado.email == "maria@exemplo.com"
    assert recuperado.senha_hash == "hash_teste_123"


def test_matricula_unica(emprestimos_session):
    """Verifica que duas matrículas iguais levantam IntegrityError."""
    c1 = Cliente(nome="João", email="j@a.com", telefone="11111111111", matricula="RA999", senha_hash="h1")
    c2 = Cliente(nome="Ana", email="a@a.com", telefone="22222222222", matricula="RA999", senha_hash="h2")
    emprestimos_session.add_all([c1, c2])
    with pytest.raises(IntegrityError):
        emprestimos_session.commit()


# ---------------------------------------------------------------------------
# Testes do modelo Emprestimo (emprestimos.db)
# ---------------------------------------------------------------------------

def test_criacao_emprestimo(emprestimos_session):
    """Verifica que um empréstimo pode ser inserido e associado a um cliente."""
    cliente = Cliente(
        nome="Carlos", email="c@a.com", telefone="33333333333", matricula="RA001", senha_hash="h3"
    )
    emprestimos_session.add(cliente)
    emprestimos_session.flush()

    emprestimo = Emprestimo(
        cliente_id=cliente.id,
        equipamento_id=1,
        nome_equipamento="Multímetro",
        quantidade=2,
        data_emprestimo=date.today(),
        prazo_devolucao=date.today() + timedelta(days=30),
    )
    emprestimos_session.add(emprestimo)
    emprestimos_session.commit()

    emp = emprestimos_session.query(Emprestimo).first()
    assert emp is not None
    assert emp.quantidade == 2
    assert emp.devolvido is False
    assert emp.data_devolucao is None


def test_emprestimo_quantidade_zero_invalida(emprestimos_session):
    """Verifica que quantidade == 0 no empréstimo levanta IntegrityError."""
    cliente = Cliente(
        nome="Pedro", email="p@a.com", telefone="44444444444", matricula="RA002", senha_hash="h4"
    )
    emprestimos_session.add(cliente)
    emprestimos_session.flush()

    emp = Emprestimo(
        cliente_id=cliente.id,
        equipamento_id=1,
        nome_equipamento="Osciloscópio",
        quantidade=0,
        data_emprestimo=date.today(),
        prazo_devolucao=date.today() + timedelta(days=30),
    )
    emprestimos_session.add(emp)
    with pytest.raises(IntegrityError):
        emprestimos_session.commit()


# ---------------------------------------------------------------------------
# Teste do seed
# ---------------------------------------------------------------------------

def test_seed_popula_estoque(estoque_session):
    """Verifica que o seed insere ao menos 5 equipamentos."""
    from app.database.seed_estoque import EQUIPAMENTOS_INICIAIS
    from app.models.estoque import Equipamento

    for dados in EQUIPAMENTOS_INICIAIS:
        existe = estoque_session.query(Equipamento).filter_by(nome=dados["nome"]).first()
        if not existe:
            estoque_session.add(Equipamento(**dados))
    estoque_session.commit()

    total = estoque_session.query(Equipamento).count()
    assert total >= 5
