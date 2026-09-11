from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.estoque_db import get_estoque_db
from app.models.estoque import Equipamento
from app.schemas.equipamento import EquipamentoCreate, EquipamentoUpdate, EquipamentoResponse
from app.dependencies import get_current_admin

router = APIRouter(prefix="/equipamentos", tags=["Equipamentos"])


@router.get("", response_model=list[EquipamentoResponse])
def listar_equipamentos(
    db: Session = Depends(get_estoque_db),
    _: dict = Depends(get_current_admin),
):
    return db.query(Equipamento).all()


@router.get("/{id}", response_model=EquipamentoResponse)
def detalhar_equipamento(
    id: int,
    db: Session = Depends(get_estoque_db),
    _: dict = Depends(get_current_admin),
):
    eq = db.query(Equipamento).filter_by(id=id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    return eq


@router.post("", response_model=EquipamentoResponse, status_code=status.HTTP_201_CREATED)
def criar_equipamento(
    body: EquipamentoCreate,
    db: Session = Depends(get_estoque_db),
    _: dict = Depends(get_current_admin),
):
    eq = Equipamento(**body.model_dump())
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return eq


@router.put("/{id}", response_model=EquipamentoResponse)
def atualizar_equipamento(
    id: int,
    body: EquipamentoUpdate,
    db: Session = Depends(get_estoque_db),
    _: dict = Depends(get_current_admin),
):
    eq = db.query(Equipamento).filter_by(id=id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(eq, campo, valor)
    db.commit()
    db.refresh(eq)
    return eq


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_equipamento(
    id: int,
    db: Session = Depends(get_estoque_db),
    _: dict = Depends(get_current_admin),
):
    eq = db.query(Equipamento).filter_by(id=id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    db.delete(eq)
    db.commit()
