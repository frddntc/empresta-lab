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

class ClienteInfo(BaseModel):
    """Dados fornecidos pelo cliente ao agente, exibidos ao admin no painel.
    Nunca inclui senha_hash."""
    id: int
    nome: str
    email: str
    telefone: str
    matricula: str

    model_config = {"from_attributes": True}

class EmprestimoResponse(BaseModel):
    id: int
    cliente_id: int | None   # NULL quando o cliente foi removido (ON DELETE SET NULL)
    equipamento_id: int
    nome_equipamento: str
    quantidade: int
    data_emprestimo: date
    prazo_devolucao: date
    devolvido: bool
    data_devolucao: date | None
    # Após a devolução o cliente é removido da base (regra de negócio),
    # então o objeto pode vir None na resposta de `PUT /{id}/devolver`.
    cliente: ClienteInfo | None

    model_config = {"from_attributes": True}
