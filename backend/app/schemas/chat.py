from pydantic import BaseModel

class ChatMessage(BaseModel):
    role: str   # "user" ou "model"
    text: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
