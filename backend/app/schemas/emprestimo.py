from datetime import date
from pydantic import BaseModel

class EmprestimoCreate(BaseModel):
    equipamento_id: int
    quantidade: int
    nome: str              # nome completo do cliente
    email: str
    telefone: str
    matricula: str
    prazo_dias: int = 30   # definido pelo admin

class EmprestimoResponse(BaseModel):
    id: int
    cliente_id: int
    equipamento_id: int
    nome_equipamento: str
    quantidade: int
    data_emprestimo: date
    prazo_devolucao: date
    devolvido: bool
    data_devolucao: date | None

    model_config = {"from_attributes": True}
