from datetime import date
from sqlalchemy import Integer, String, Boolean, Date, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.emprestimos_db import EmprestimosBase

class Cliente(EmprestimosBase):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    telefone: Mapped[str] = mapped_column(String(20), nullable=False)
    matricula: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    senha_hash: Mapped[str] = mapped_column(String(200), nullable=False)

    emprestimos: Mapped[list["Emprestimo"]] = relationship("Emprestimo", back_populates="cliente")


class Emprestimo(EmprestimosBase):
    __tablename__ = "emprestimos"
    __table_args__ = (
        CheckConstraint("quantidade > 0", name="ck_emprestimo_quantidade_positiva"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cliente_id: Mapped[int] = mapped_column(Integer, ForeignKey("clientes.id"), nullable=False)
    equipamento_id: Mapped[int] = mapped_column(Integer, nullable=False)
    nome_equipamento: Mapped[str] = mapped_column(String(150), nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False)
    data_emprestimo: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    prazo_devolucao: Mapped[date] = mapped_column(Date, nullable=False)
    devolvido: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    data_devolucao: Mapped[date | None] = mapped_column(Date, nullable=True)

    cliente: Mapped["Cliente"] = relationship("Cliente", back_populates="emprestimos")
