from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import CORS_ORIGINS
from app.database.init_db import init_db
from app.database.seed_estoque import seed_estoque


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: inicializar bancos e seed
    init_db()
    seed_estoque()
    yield
    # Shutdown: nada a fazer por enquanto


app = FastAPI(
    title="Empresta Lab API",
    description="API para controle de empréstimo de equipamentos de laboratório.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Infra"])
def health_check():
    return {"status": "ok"}


from app.routers.auth import router as auth_router
from app.routers.equipamentos import router as equipamentos_router
from app.routers.emprestimos import router as emprestimos_router
from app.routers.chat import router as chat_router

app.include_router(auth_router)
app.include_router(equipamentos_router)
app.include_router(emprestimos_router)
app.include_router(chat_router)

