from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from app.core.security import decode_token

bearer_scheme = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    try:
        payload = decode_token(credentials.credentials)
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado.")


def get_current_cliente(payload: dict = Depends(get_current_user)) -> dict:
    if payload.get("role") != "cliente":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a clientes.")
    return payload


def get_current_admin(payload: dict = Depends(get_current_user)) -> dict:
    if payload.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores.")
    return payload
