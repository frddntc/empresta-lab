# Prompt 00 — Infraestrutura Docker: Sistema Empresta Lab

> **Ordem de implementação:** Este é o ponto de partida. Configure o `docker-compose.yml` antes de implementar qualquer frente (banco, backend ou frontend). Os demais prompts dependem desta configuração.

---

## Objetivo

Configurar a infraestrutura de contêineres Docker do sistema **Empresta Lab**, orquestrando três serviços via `docker-compose.yml`:

- **`backend`** — API FastAPI (Python 3.12-slim), porta `8000`.
- **`frontend`** — Build React/Vite servido por Nginx (Node 20-alpine + nginx:alpine), porta `80`.
- **`db_volume`** — Os arquivos `.db` do SQLite ficam num **volume Docker persistente** montado no contêiner do backend.

---

## Contexto

O projeto usa **SQLite** como banco de dados. Como o SQLite não possui servidor próprio, os arquivos `estoque.db` e `emprestimos.db` são armazenados num volume Docker nomeado (`empresta_db_data`) montado em `/app/data/` dentro do contêiner do backend. Isso garante que os dados sobrevivam à recriação dos contêineres.

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

- Usar **`docker-compose.yml`** versão `"3.9"`.
- O serviço `frontend` **depende** do serviço `backend` (`depends_on`).
- Todos os segredos (chave Gemini, segredo JWT, credenciais admin) devem ser injetados via **variáveis de ambiente** referenciadas no `.env` — nunca hardcoded no `docker-compose.yml`.
- O volume `empresta_db_data` deve ser do tipo **named volume** (não bind mount), garantindo portabilidade.
- A rede interna (`empresta_net`) deve usar o driver `bridge`.
- O `nginx.conf` deve incluir o bloco `try_files $uri $uri/ /index.html` para suportar o roteamento do React (SPA).

---

## Arquivos a Criar

### `docker-compose.yml` (raiz do projeto)

```yaml
version: "3.9"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: empresta_backend
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_USER=${ADMIN_USER}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - DATABASE_DIR=/app/data
    volumes:
      - empresta_db_data:/app/data
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
  empresta_db_data:
    name: empresta_db_data

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

- [ ] `docker-compose.yml` é válido e pode ser verificado com `docker compose config` sem erros.
- [ ] O volume `empresta_db_data` é do tipo named volume (não bind mount).
- [ ] As variáveis de ambiente são lidas do `.env` e nunca hardcoded.
- [ ] O `nginx.conf` inclui o proxy `/api/` apontando para `http://backend:8000/`.
- [ ] O `nginx.conf` inclui o bloco `try_files` para SPA.
- [ ] Os `.dockerignore` excluem `node_modules/`, `__pycache__/`, arquivos `.db` e `.env`.
- [ ] O serviço `frontend` declara `depends_on: backend`.
- [ ] Após implementar os Dockerfiles (Prompts 02.1 e 03.1), `docker compose up --build` sobe os serviços sem erros.

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
