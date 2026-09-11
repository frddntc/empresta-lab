from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.estoque_db import get_estoque_db
from app.database.emprestimos_db import get_emprestimos_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import processar_chat
from app.dependencies import get_current_cliente

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
def enviar_mensagem_chat(
    body: ChatRequest,
    estoque_db: Session = Depends(get_estoque_db),
    emprestimos_db: Session = Depends(get_emprestimos_db),
    _: dict = Depends(get_current_cliente),
):
    resposta = processar_chat(body.message, body.history, estoque_db, emprestimos_db)
    return ChatResponse(reply=resposta)
