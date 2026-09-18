from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session, joinedload
from app.database.estoque_db import get_estoque_db
from app.database.emprestimos_db import get_emprestimos_db
from app.models.emprestimos import Emprestimo, Cliente
from app.schemas.emprestimo import EmprestimoCreate, EmprestimoResponse
from app.services.emprestimo_service import registrar_emprestimo, registrar_devolucao
from app.dependencies import get_current_admin, get_current_cliente

router = APIRouter(prefix="/emprestimos", tags=["Empréstimos"])


@router.get("", response_model=list[EmprestimoResponse])
def listar_emprestimos(
    estoque_db: Session = Depends(get_estoque_db),
    emprestimos_db: Session = Depends(get_emprestimos_db),
    _: dict = Depends(get_current_admin),
):
    return (
        emprestimos_db.query(Emprestimo)
        .options(joinedload(Emprestimo.cliente))  # dados do cliente p/ exibição no painel
        .filter_by(devolvido=False)
        .all()
    )


@router.get("/me", response_model=list[EmprestimoResponse])
def meus_emprestimos_ativos(
    emprestimos_db: Session = Depends(get_emprestimos_db),
    payload: dict = Depends(get_current_cliente),
):
    """Empréstimos ATIVOS do próprio cliente autenticado (role=cliente).
    O vínculo é feito pela matrícula do token -> cliente -> empréstimos."""
    matricula = payload.get("sub")
    cliente = emprestimos_db.query(Cliente).filter_by(matricula=matricula).first()
    if not cliente:
        return []
    return (
        emprestimos_db.query(Emprestimo)
        .options(joinedload(Emprestimo.cliente))
        .filter_by(cliente_id=cliente.id, devolvido=False)
        .order_by(Emprestimo.prazo_devolucao)
        .all()
    )


@router.post("", response_model=EmprestimoResponse, status_code=status.HTTP_201_CREATED)
def criar_emprestimo(
    body: EmprestimoCreate,
    estoque_db: Session = Depends(get_estoque_db),
    emprestimos_db: Session = Depends(get_emprestimos_db),
    _: dict = Depends(get_current_admin),
):
    return registrar_emprestimo(body, estoque_db, emprestimos_db)


@router.put("/{id}/devolver", response_model=EmprestimoResponse)
def devolver_emprestimo(
    id: int,
    estoque_db: Session = Depends(get_estoque_db),
    emprestimos_db: Session = Depends(get_emprestimos_db),
    _: dict = Depends(get_current_admin),
):
    return registrar_devolucao(id, estoque_db, emprestimos_db)
