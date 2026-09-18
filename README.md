# Empresta Lab

Sistema de empréstimos de equipamentos de laboratório com atendimento por agente de IA.

Alunos conversam com um assistente virtual (Google Gemini) para solicitar empréstimos; administradores gerenciam o catálogo e controlam devoluções em um painel web. Full-stack: **React + Vite** no frontend, **FastAPI** no backend e **PostgreSQL 16** em Docker.

---

## Funcionalidades

| Perfil | O que pode fazer |
|---|---|
| **Visitante** | Conhecer o laboratório na Home e criar conta |
| **Cliente** | Conversar com o agente de IA para reservar equipamentos, acompanhar empréstimos ativos e fazer login com matrícula + senha (clientes recorrentes não repetem dados) |
| **Administrador** | Gerenciar o estoque (CRUD de equipamentos), ver empréstimos ativos com os dados de quem pegou, dar baixa em devoluções |

**Regras de negócio principais:**

- O agente verifica a matrícula na base antes de pedir dados — clientes recorrentes vão direto ao pedido.
- Ao concluir a devolução, o empréstimo fica como histórico e o cliente é removido da base (LGPD-friendly); se voltar, é cadastrado de novo e a sequência de IDs é reaproveitada.
- Sessões JWT com expiração curta (15 min de inatividade → novo login).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, React Router, Vitest + Testing Library (35 testes) |
| Backend | FastAPI, SQLAlchemy 2.x, Pydantic, PyJWT, bcrypt (16 testes) |
| Banco | PostgreSQL 16 (Docker) com fallback automático para SQLite no modo local |
| IA | Google Gemini (`gemini-3.5-flash-lite` por padrão, configurável) |
| Infra | Docker Compose — `db` + `backend` + `frontend` (Nginx com proxy `/api`) |

```
┌────────────────────┐   /api   ┌─────────────────────┐      ┌──────────────────┐
│  frontend (Nginx)  │ ───────► │  backend (FastAPI)  │ ───► │  db (PostgreSQL) │
│  :80 (build React) │  proxy   │  :8000 (uvicorn)    │      │  volume persist. │
└────────────────────┘          └──────────┬──────────┘      └──────────────────┘
                                           │ Gemini API (chat)
```

---

## Como rodar

> Guia completo (incluindo pré-requisitos do Windows, troubleshooting e migração de dados legados): **[setup.md](setup.md)**.

### Com Docker (recomendado)

```bash
# 1. Configure as variáveis de ambiente
cp .env.example .env    # edite GEMINI_API_KEY, JWT_SECRET e ADMIN_PASSWORD

# 2. Suba a stack
docker compose up -d --build

# 3. Acesse
#    Aplicação:  http://localhost
#    Swagger:    http://localhost/api/docs
```

Na primeira execução o backend cria as tabelas e semeia o catálogo com 6 equipamentos de exemplo automaticamente.

### Sem Docker (desenvolvimento)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
# crie backend/.env a partir do .env.example da raiz
python -m uvicorn app.main:app --reload --port 8000

# Frontend (outro terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173 (proxy /api → :8000)
```

Sem `DATABASE_URL`, o backend usa arquivos SQLite em `DATABASE_DIR` (padrão `data/`) — sem PostgreSQL na máquina.

### Variáveis de ambiente

Veja [`​.env.example`](.env.example) — a tabela completa com a função de cada chave está no [setup.md](setup.md). Resumo:

| Chave | Uso |
|---|---|
| `GEMINI_API_KEY` | Chat com o agente (sem ela, o resto do sistema funciona) |
| `JWT_SECRET` | Assinatura dos tokens de sessão |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Login do painel administrativo (`/admin/login`) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciais do container `db` |

> ⚠️ **Nunca versione o `.env`.** Ele está no `.gitignore`; o único arquivo de ambiente no repositório é o `.env.example`, com valores de exemplo.

---

## Testes

```bash
# Backend — 16 testes (modelos + API de integração, SQLite in-memory, Gemini mockado)
cd backend && python -m pytest tests/ -v

# Frontend — 35 testes (componentes, APIs mockadas)
cd frontend && npm test
```

---

## Estrutura do projeto

```
├── docker-compose.yml        # db + backend + frontend
├── .env.example              # variáveis de ambiente de exemplo
├── backend/
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py           # FastAPI: routers + init_db no startup
│   │   ├── core/             # config (.env) e security (JWT/bcrypt)
│   │   ├── database/         # engines/sessions + init_db + seed
│   │   ├── models/           # SQLAlchemy: Equipamento, Cliente, Emprestimo
│   │   ├── schemas/          # Pydantic
│   │   ├── routers/          # /auth, /equipamentos, /emprestimos, /chat
│   │   └── services/         # regras de negócio + integração Gemini
│   ├── scripts/              # migração SQLite → PostgreSQL (legado)
│   └── tests/                # pytest (16 testes)
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf            # proxy /api + SPA fallback
│   └── src/
│       ├── api/              # cliente HTTP (axios) com interceptor 401
│       ├── context/          # AuthContext (sessão)
│       ├── pages/            # Home, Login/Register, Chat, Admin*, MeusEmpréstimos
│       └── __tests__/        # Vitest + Testing Library (35 testes)
├── prompts/                  # especificação incremental do projeto (fonte da verdade)
│   ├── 00_docker_compose.md
│   ├── 01_modelo_de_dados/
│   ├── 02_backend_api/
│   └── 03_frontend/
└── setup.md                  # guia completo de instalação e execução
```

---

## Documentação

- **[setup.md](setup.md)** — instalação passo a passo, variáveis de ambiente, troubleshooting e operação do dia a dia.
- **[prompts/](prompts/)** — a especificação incremental do projeto, mantida como **fonte única da verdade** da implementação vigente: cada prompt descreve objetivo, escopo, restrições, arquivos, código de referência e critérios de aceite da funcionalidade na sua versão final (não é um histórico de mudanças).

---

## Segurança

- Senhas de clientes: hash **bcrypt**; sessões: **JWT HS256** com expiração curta.
- Nenhum segredo no repositório: todo valor sensível vem de variáveis de ambiente (`.env`, ignorado pelo Git).
- O login do admin não usa banco: credenciais definidas por `ADMIN_USER`/`ADMIN_PASSWORD` no ambiente.

---

## Licença

Projeto acadêmico — distribua conforme a licença da sua instituição.
