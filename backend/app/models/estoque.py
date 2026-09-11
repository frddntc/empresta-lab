from sqlalchemy import Integer, String, Text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database.estoque_db import EstoqueBase

class Equipamento(EstoqueBase):
    __tablename__ = "equipamentos"
    __table_args__ = (
        CheckConstraint("quantidade >= 0", name="ck_equipamento_quantidade_nao_negativa"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False)
