from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.estoque_db import get_estoque_db
from app.database.emprestimos_db import get_emprestimos_db
from app.models.emprestimos import Emprestimo
from app.schemas.emprestimo import EmprestimoCreate, EmprestimoResponse
from app.services.emprestimo_service import registrar_emprestimo, registrar_devolucao
from app.dependencies import get_current_admin

router = APIRouter(prefix="/emprestimos", tags=["Empréstimos"])


@router.get("", response_model=list[EmprestimoResponse])
def listar_emprestimos(
    estoque_db: Session = Depends(get_estoque_db),
    emprestimos_db: Session = Depends(get_emprestimos_db),
    _: dict = Depends(get_current_admin),
):
    return emprestimos_db.query(Emprestimo).filter_by(devolvido=False).all()


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
