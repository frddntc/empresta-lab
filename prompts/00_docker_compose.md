# Prompt 00 — Infraestrutura Docker: Sistema Empresta Lab

> **Ordem de implementação:** Este é o ponto de partida. Configure o `docker-compose.yml` antes de implementar qualquer frente (banco, backend ou frontend). Os demais prompts dependem desta configuração.

---

## Objetivo

Configurar a infraestrutura de contêineres Docker do sistema **Empresta Lab**, orquestrando três serviços via `docker-compose.yml`:

- **`backend`** — API FastAPI (Python 3.12-slim), porta `8000`.
- **`frontend`** — Build React/Vite servido por Nginx (Node 20-alpine + nginx:alpine), porta `80`.
- **`db`** — Banco de dados **PostgreSQL 16-alpine** em contêiner dedicado, com volume
  persistente (`empresta_pg_data`) e healthcheck (`pg_isready`). O backend só sobe depois do
  banco estar saudável (`depends_on: condition: service_healthy`).

---

## Contexto

O projeto usa **PostgreSQL** em Docker (contêiner `db`). Nas tabelas do compose, as credenciais e o nome do banco são configuráveis por `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` no `.env` da raiz (defaults: `empresta` / `empresta_dev_password` / `empresta`). O backend recebe a connection string via `DATABASE_URL` e garante que os dados sobrevivam à recriação dos contêineres pelo volume `empresta_pg_data`.

> **Modo local (sem Docker):** sem `DATABASE_URL`, o backend cai automaticamente para arquivos SQLite em `DATABASE_DIR` — útil para desenvolvimento rápido e para os testes (sempre SQLite in-memory).

O frontend, após o build estático, é servido pelo **Nginx**, que também atua como **reverse proxy**: rotas com prefixo `/api/` são encaminhadas ao serviço `backend` na rede interna do Docker, evitando problemas de CORS em produção.

---

## Escopo

Esta tarefa cobre **exclusivamente** a infraestrutura Docker:

- `docker-compose.yml` na raiz do projeto.
- `frontend/nginx.conf` — configuração do Nginx (proxy reverso + SPA fallback).
- `.env.example` na raiz — variáveis de ambiente necessárias para todos os serviços.
- `.dockerignore` nas pastas `backend/` e `frontend/`.

> ⚠️ **Não crie Dockerfiles aqui.** O `Dockerfile` do backend é criado no Prompt 02.1 e o do frontend no Prompt 03.1. Este prompt apenas referencia esses arquivos no `docker-compose.yml`.

---

## Restrições

> ⚠️ **Não altere nada além do que está descrito neste prompt.**
> Não implemente rotas, modelos de dados, componentes React, lógica de negócio ou qualquer outro artefato que não seja estritamente configuração de infraestrutura Docker.

- O `docker-compose.yml` fica **sem** o atributo `version` (obsoleto no Compose v2; gera warning se presente).
- O serviço `frontend` **depende** do serviço `backend` (`depends_on`).
- Todos os segredos (chave Gemini, segredo JWT, credenciais admin) devem ser injetados via **variáveis de ambiente** referenciadas no `.env` — nunca hardcoded no `docker-compose.yml`.
- O volume `empresta_pg_data` (dados do PostgreSQL) deve ser do tipo **named volume** (não bind mount), garantindo portabilidade.
- A rede interna (`empresta_net`) deve usar o driver `bridge`.
- O `nginx.conf` deve incluir o bloco `try_files $uri $uri/ /index.html` para suportar o roteamento do React (SPA).

---

## Arquivos a Criar

### `docker-compose.yml` (raiz do projeto)

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: empresta_db
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-empresta}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-empresta_dev_password}
      - POSTGRES_DB=${POSTGRES_DB:-empresta}
    volumes:
      - empresta_pg_data:/var/lib/postgresql/data
    networks:
      - empresta_net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-empresta} -d ${POSTGRES_DB:-empresta}"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: empresta_backend
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=${GEMINI_MODEL:-gemini-3.5-flash-lite}
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_USER=${ADMIN_USER}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - DATABASE_URL=postgresql+psycopg2://${POSTGRES_USER:-empresta}:${POSTGRES_PASSWORD:-empresta_dev_password}@db:5432/${POSTGRES_DB:-empresta}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - empresta_net
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: empresta_frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - empresta_net
    restart: unless-stopped

volumes:
  empresta_pg_data:
    name: empresta_pg_data

networks:
  empresta_net:
    driver: bridge
```

### `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy reverso para o backend FastAPI
    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback: todas as rotas servem o index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### `.env.example` (raiz do projeto)

```env
# Chave de API do Google Gemini (obtenha em https://aistudio.google.com)
GEMINI_API_KEY=sua_chave_aqui

# Segredo para assinatura dos tokens JWT (string aleatória longa)
JWT_SECRET=troque_por_uma_string_secreta_longa

# Credenciais do administrador do sistema
ADMIN_USER=admin
ADMIN_PASSWORD=troque_por_uma_senha_forte

# Modelo do Gemini usado pelo chat (opcional; default do backend)
GEMINI_MODEL=gemini-3.5-flash-lite

# Banco de dados PostgreSQL (container "db" do compose; defaults abaixo)
POSTGRES_USER=empresta
POSTGRES_PASSWORD=empresta_dev_password
POSTGRES_DB=empresta
```

### `backend/.dockerignore`

```
__pycache__/
*.pyc
*.pyo
*.db
.env
.venv/
venv/
.pytest_cache/
tests/
*.egg-info/
dist/
build/
```

### `frontend/.dockerignore`

```
node_modules/
dist/
.env
.env.local
*.log
.vite/
```

---

## Critérios de Aceite

- [x] `docker-compose.yml` é válido e pode ser verificado com `docker compose config` sem erros.
- [x] O volume `empresta_pg_data` é do tipo named volume (não bind mount).
- [x] O serviço `db` tem healthcheck e o backend só inicia com o banco saudável.
- [x] As variáveis de ambiente são lidas do `.env` e nunca hardcoded.
- [x] O `nginx.conf` inclui o proxy `/api/` apontando para `http://backend:8000/`.
- [x] O `nginx.conf` inclui o bloco `try_files` para SPA.
- [x] Os `.dockerignore` excluem `node_modules/`, `__pycache__/`, arquivos `.db` e `.env`.
- [x] O serviço `frontend` declara `depends_on: backend`.
- [x] Após implementar os Dockerfiles (Prompts 02.1 e 03.1), `docker compose up --build` sobe os serviços sem erros.

---

## Notas de Implementação

Desvios conscientes em relação ao código literal acima, validados em execução real (Docker 29.x / Compose v5):

1. **Atributo `version` removido** do `docker-compose.yml` — no Compose v2 ele é obsoleto e gera warning em todo comando.
2. **`nginx.conf` deve ser salvo em UTF-8 SEM BOM.** Um BOM (`U+FEFF`) no início do arquivo derruba o Nginx com `unknown directive "﻿server"` e o container entra em loop de restart. O arquivo do repositório está sem BOM; evite regravá-lo com "UTF-8 com BOM" no editor.
3. **PostgreSQL em contêiner dedicado (evolução do design original):** o prompt inicial usava arquivos SQLite num volume do backend; a stack validada hoje roda **PostgreSQL 16-alpine** no serviço `db`, com healthcheck `pg_isready`, credenciais via `.env` e volume `empresta_pg_data`. O backend recebe `DATABASE_URL` e mantém fallback automático para SQLite quando a variável não existe (modo local). Depois de trocar o banco, rode `docker compose restart frontend` (ou recrie) — o Nginx cacheia o IP antigo do backend e responde 502 até reiniciar.
4. **Migração SQLite → PostgreSQL:** os dados legados do volume `empresta_db_data` foram copiados com `backend/scripts/migrate_sqlite_to_postgres.py` (idempotente; preserva histórico de empréstimos de clientes já removidos com `cliente_id NULL`).
3. **`.env.example` ganhou `GEMINI_MODEL`** (modelo configurável do chat; o backend usa `gemini-3.5-flash-lite` por padrão).
4. Todos os critérios foram verificados com a stack real no ar: `compose config` limpo, containers estáveis, proxy `/api` e SPA fallback respondendo 200, login admin via Nginx funcionando.

---

## Verificação Manual

```bash
docker compose config
docker compose up --build
docker compose ps
curl http://localhost:8000/health
curl http://localhost/
curl http://localhost/api/health
```
