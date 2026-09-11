from pydantic import BaseModel, field_validator

class EquipamentoCreate(BaseModel):
    nome: str
    descricao: str | None = None
    categoria: str
    quantidade: int

    @field_validator("quantidade")
    @classmethod
    def quantidade_nao_negativa(cls, v):
        if v < 0:
            raise ValueError("Quantidade não pode ser negativa.")
        return v

class EquipamentoUpdate(BaseModel):
    nome: str | None = None
    descricao: str | None = None
    categoria: str | None = None
    quantidade: int | None = None

    @field_validator("quantidade")
    @classmethod
    def quantidade_nao_negativa(cls, v):
        if v is not None and v < 0:
            raise ValueError("Quantidade não pode ser negativa.")
        return v

class EquipamentoResponse(BaseModel):
    id: int
    nome: str
    descricao: str | None
    categoria: str
    quantidade: int

    model_config = {"from_attributes": True}
