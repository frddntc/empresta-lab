from pydantic import BaseModel, EmailStr

class ClienteLogin(BaseModel):
    matricula: str
    senha: str

class ClienteRegister(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    matricula: str
    senha: str

class AdminLogin(BaseModel):
    usuario: str
    senha: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
