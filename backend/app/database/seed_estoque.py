from sqlalchemy.orm import Session
from app.database.estoque_db import EstoqueSession
from app.models.estoque import Equipamento

EQUIPAMENTOS_INICIAIS = [
    {
        "nome": "Paquímetro",
        "descricao": "Instrumento de medição de precisão para dimensões lineares.",
        "categoria": "Medição",
        "quantidade": 5,
    },
    {
        "nome": "Multímetro Digital",
        "descricao": "Medição de tensão, corrente elétrica e resistência.",
        "categoria": "Medição",
        "quantidade": 3,
    },
    {
        "nome": "Osciloscópio",
        "descricao": "Análise e visualização de sinais elétricos.",
        "categoria": "Medição",
        "quantidade": 2,
    },
    {
        "nome": "EPI - Óculos de Proteção",
        "descricao": "Óculos de proteção individual contra respingos e partículas.",
        "categoria": "Segurança",
        "quantidade": 10,
    },
    {
        "nome": "EPI - Luva Química",
        "descricao": "Luvas de proteção contra agentes químicos.",
        "categoria": "Segurança",
        "quantidade": 8,
    },
    {
        "nome": "Termômetro de Infravermelho",
        "descricao": "Medição de temperatura sem contato.",
        "categoria": "Medição",
        "quantidade": 4,
    },
]

def seed_estoque() -> None:
    """Popula o estoque.db com equipamentos iniciais. Idempotente: não duplica registros."""
    db: Session = EstoqueSession()
    try:
        for dados in EQUIPAMENTOS_INICIAIS:
            existe = db.query(Equipamento).filter_by(nome=dados["nome"]).first()
            if not existe:
                equipamento = Equipamento(**dados)
                db.add(equipamento)
        db.commit()
    finally:
        db.close()
