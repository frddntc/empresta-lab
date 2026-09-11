from datetime import date, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.estoque import Equipamento
from app.models.emprestimos import Cliente, Emprestimo
from app.schemas.emprestimo import EmprestimoCreate


def registrar_emprestimo(
    body: EmprestimoCreate,
    estoque_db: Session,
    emprestimos_db: Session,
) -> Emprestimo:
    # 1. Verificar disponibilidade no estoque
    eq = estoque_db.query(Equipamento).filter_by(id=body.equipamento_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    if eq.quantidade < body.quantidade:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Estoque insuficiente. Disponível: {eq.quantidade}.",
        )

    # 2. Subtrair do estoque
    eq.quantidade -= body.quantidade
    estoque_db.commit()

    # 3. Obter ou criar cliente
    cliente = emprestimos_db.query(Cliente).filter_by(matricula=body.matricula).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado. Realize o cadastro primeiro.")

    # 4. Criar registro de empréstimo
    hoje = date.today()
    emprestimo = Emprestimo(
        cliente_id=cliente.id,
        equipamento_id=eq.id,
        nome_equipamento=eq.nome,
        quantidade=body.quantidade,
        data_emprestimo=hoje,
        prazo_devolucao=hoje + timedelta(days=body.prazo_dias),
    )
    emprestimos_db.add(emprestimo)
    emprestimos_db.commit()
    emprestimos_db.refresh(emprestimo)
    return emprestimo


def registrar_devolucao(
    emprestimo_id: int,
    estoque_db: Session,
    emprestimos_db: Session,
) -> Emprestimo:
    emprestimo = emprestimos_db.query(Emprestimo).filter_by(id=emprestimo_id).first()
    if not emprestimo:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")
    if emprestimo.devolvido:
        raise HTTPException(status_code=400, detail="Empréstimo já devolvido.")

    # Restaurar estoque
    eq = estoque_db.query(Equipamento).filter_by(id=emprestimo.equipamento_id).first()
    if eq:
        eq.quantidade += emprestimo.quantidade
        estoque_db.commit()

    # Marcar como devolvido
    emprestimo.devolvido = True
    emprestimo.data_devolucao = date.today()
    emprestimos_db.commit()
    emprestimos_db.refresh(emprestimo)
    return emprestimo
