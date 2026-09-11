from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.emprestimos_db import get_emprestimos_db
from app.models.emprestimos import Cliente
from app.schemas.auth import ClienteLogin, ClienteRegister, AdminLogin, TokenResponse
from app.core.security import hash_password, verify_password, create_token
from app.core.config import ADMIN_USER, ADMIN_PASSWORD

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/cliente/register", status_code=status.HTTP_201_CREATED)
def registrar_cliente(body: ClienteRegister, db: Session = Depends(get_emprestimos_db)):
    if db.query(Cliente).filter_by(matricula=body.matricula).first():
        raise HTTPException(status_code=400, detail="Matrícula já cadastrada.")
    cliente = Cliente(
        nome=body.nome,
        email=body.email,
        telefone=body.telefone,
        matricula=body.matricula,
        senha_hash=hash_password(body.senha),
    )
    db.add(cliente)
    db.commit()
    return {"mensagem": "Cliente cadastrado com sucesso."}


@router.post("/cliente/login", response_model=TokenResponse)
def login_cliente(body: ClienteLogin, db: Session = Depends(get_emprestimos_db)):
    cliente = db.query(Cliente).filter_by(matricula=body.matricula).first()
    if not cliente or not verify_password(body.senha, cliente.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas.")
    token = create_token(sub=cliente.matricula, role="cliente")
    return TokenResponse(access_token=token)


@router.post("/admin/login", response_model=TokenResponse)
def login_admin(body: AdminLogin):
    if body.usuario != ADMIN_USER or body.senha != ADMIN_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais de admin inválidas.")
    token = create_token(sub=ADMIN_USER, role="admin")
    return TokenResponse(access_token=token)
