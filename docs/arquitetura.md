# Arquitetura

Visão geral técnica do Empresta Lab: o que o sistema é, como os componentes se conectam e como roda em cada ambiente.

---

## O sistema em uma frase

Alunos (clientes) conversam com um agente de IA para reservar equipamentos de laboratório; administradores gerenciam o catálogo e controlam os empréstimos ativos e devoluções em um painel web.

## Componentes

```
┌──────────────────────┐   /api/*   ┌─────────────────────┐    SQL     ┌──────────────────┐
│  frontend (Nginx)    │ ────────►  │  backend (FastAPI)  │ ─────────► │  db (PostgreSQL) │
│  :80 — build React   │  proxy     │  :8000 — uvicorn    │  SQLAlchemy│  volume persist. │
└──────────────────────┘            └──────────┬──────────┘            └──────────────────┘
        ▲                                      │
        │ HTTPS (navegador)                    │ function calling (tools)
        │                                      ▼
        │                           ┌─────────────────────┐
        └──────────────────────────►│  Google Gemini API  │
              HTTP direto em dev    │  (agente do chat)   │
              (:5173 Vite)          └─────────────────────┘
```

| Componente | Tecnologia | Papel |
|---|---|---|
| **Frontend** | React 19 + Vite + React Router + axios | SPA com Home institucional, login/cadastro de cliente, chat com o agente, página "Acompanhar empréstimos ativos" e painel administrativo (empréstimos + CRUD de estoque) |
| **Backend** | FastAPI + SQLAlchemy 2.x + Pydantic + PyJWT + bcrypt | API REST com 4 routers (`/auth`, `/equipamentos`, `/emprestimos`, `/chat`), autenticação JWT com roles, regras de negócio e orquestração do agente |
| **Banco** | PostgreSQL 16 (Docker) | Dados persistentes em volume `empresta_pg_data`, com healthcheck |
| **Agente** | Google Gemini (`gemini-3.5-flash-lite` por padrão) | Converse com o cliente usando **function calling** para consultar estoque, reconhecer clientes e registrar empréstimos |

## Fronteiras importantes

- **Banco único:** em produção (Docker), os dois engines do backend (`estoque` e `emprestimos`) apontam para o **mesmo PostgreSQL** via `DATABASE_URL`. O fallback para dois arquivos SQLite locais (`data/estoque.db`, `data/emprestimos.db`) só existe no modo desenvolvimento sem Docker.
- **A única "FK entre módulos"** (`emprestimos.equipamento_id` → catálogo de estoque) é lógica: coluna INTEGER simples, integridade garantida pela camada de serviço. A FK nativa `cliente_id → clientes.id` (com `ON DELETE SET NULL`) é interna ao mesmo banco.
- **Admin não vive no banco:** as credenciais do administrador vêm do ambiente (`ADMIN_USER`/`ADMIN_PASSWORD`) e o login emite o mesmo formato de JWT com `role=admin`. O perfil de cliente, sim, é tabela (`clientes`).
- **Chat stateless:** cada mensagem envia o histórico completo (`ChatRequest.history`); o loop de function calling roda no backend, que executa as ferramentas contra o banco e devolve os resultados ao modelo até obter uma resposta textual.

## Fluxo de runtime do chat (o coração do sistema)

```
Cliente (React)                 Backend                          Gemini
     │  POST /chat {msg, hist}     │                                │
     │ ──────────────────────────► │  generate_content(contents) ──►│
     │                             │ ◄── function_call ─────────────│
     │                             │  executar ferramenta no banco  │
     │                             │  (ex.: verificar_disponibilidade)
     │                             │  enviar resultado ────────────►│
     │                             │ ◄── texto final ───────────────│
     │ ◄── { reply } ────────────── │                                │
```

O `SYSTEM_PROMPT` impõe o fluxo: verificar disponibilidade → confirmar → pedir matrícula → `verificar_cliente` (reconhece recorrentes) → coletar/confirmar dados → `registrar_emprestimo` → informar prazo. As três ferramentas (`verificar_disponibilidade`, `verificar_cliente`, `registrar_emprestimo`) são funções Python que consultam/escrevem no banco real — a IA nunca inventa disponibilidade nem cadastro.

## Infraestrutura

### Docker Compose (produção)

| Serviço | Imagem | Detalhes |
|---|---|---|
| `db` | `postgres:16-alpine` | Healthcheck `pg_isready`; credenciais via `.env`; volume nomeado `empresta_pg_data` |
| `backend` | build `python:3.12-slim` | Sobe só após o banco saudável (`depends_on: condition: service_healthy`); recebe `DATABASE_URL` e todos os segredos por ambiente |
| `frontend` | build `node:20-alpine` → serve `nginx:alpine` | Servidor de arquivos + reverse proxy: `/api/` → `http://backend:8000/` (o prefixo é removido), demais rotas → `index.html` (SPA fallback) |

Rede interna `empresta_net` (bridge). Portas expostas: **80** (aplicação) e **8000** (API direta).

No startup do backend: `init_db()` cria as tabelas (sem Alembic — `Base.metadata.create_all`) e `seed_estoque()` popula 6 equipamentos de exemplo de forma idempotente.

### Modo local (sem Docker)

- Backend: `uvicorn` na 8000, lendo `backend/.env` (via `python-dotenv`). Sem `DATABASE_URL`, cria `data/` e usa os dois SQLite.
- Frontend: Vite na 5173 com proxy de dev: `/api` → `http://localhost:8000`.

Em ambos os modos o frontend chama **sempre** `/api/...` (o `baseURL` do axios é `/api`) — nenhuma URL absoluta no código; quem decide o destino é o proxy (Nginx ou Vite).

## Segurança

| Aspecto | Implementação |
|---|---|
| Senhas de cliente | Hash **bcrypt** (passlib), nunca trafegam de volta |
| Sessão | JWT HS256 (`sub`=matrícula ou usuário admin, `role`), expiração de 15 min (inatividade → novo login) |
| Autorização | Dependências FastAPI: `get_current_cliente` / `get_current_admin` validam o `role` do token (401 sem/inválido, 403 com role errado) |
| Segredos | Somente por variáveis de ambiente (`.env`, ignorado pelo Git; `.env.example` documenta as chaves) |
| Superfície de ataque do admin | Login admin não consulta banco — comparado com `ADMIN_USER`/`ADMIN_PASSWORD` do ambiente |

## Padrões e decisões

- **Dois `DeclarativeBase` separados** (`EstoqueBase`, `EmprestimosBase`) espelham o design histórico de dois bancos; hoje convivem no mesmo PostgreSQL sem conflito (tabelas distintas).
- **Sem Alembic:** o schema é criado por `create_all` no startup — simplicidade acadêmica; mudanças de schema exigem recriar o volume (ou migration manual).
- **Busca do chat tolerante a acentos:** a ferramenta de disponibilidade normaliza texto em Python (`unicodedata`) em vez de depender de ILIKE do banco.
- **Validação antes do efeito:** o serviço valida o cliente **antes** de subtrair estoque (evita perder unidades com matrícula inexistente vinda do chat).

---

Detalhamentos: [API](api.md) · [Modelo de dados](modelo-de-dados.md) · [Frontend](frontend.md) · [Testes](testes.md)
