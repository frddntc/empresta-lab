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
    cliente_id: int | None   # NULL só se o cliente for removido (ON DELETE SET NULL defensivo)
    equipamento_id: int
    nome_equipamento: str
    quantidade: int
    data_emprestimo: date
    prazo_devolucao: date
    devolvido: bool
    data_devolucao: date | None
    # O cadastro do cliente é permanente (regra vigente); o campo é opcional
    # por defensividade (cliente removido manualmente no banco).
    cliente: ClienteInfo | None

    model_config = {"from_attributes": True}
