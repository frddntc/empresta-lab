# Setup — Empresta Lab

Guia completo para rodar o projeto do zero: backend FastAPI + frontend React (Vite), com ou sem Docker.

---

## Arquitetura

```
┌─────────────────────┐         ┌──────────────────────────┐
│  Frontend (Vite)    │  /api   │  Backend (FastAPI)       │
│  React + Router     │ ──────► │  /auth  /equipamentos    │
│  http://localhost:  │  proxy  │  /emprestimos  /chat     │
│  5173               │         │  http://localhost:8000   │
└─────────────────────┘         └────────────┬─────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │  PostgreSQL (container db)  │
                              │  ou SQLite (backend/data/)  │
                              │  no modo local sem          │
                              │  DATABASE_URL               │
                              └─────────────────────────────┘
```

Na produção com Docker, o Nginx (porta 80) serve o build do React e faz o proxy de `/api` para o backend, e o banco é um **container PostgreSQL 16** (`empresta_db`) com volume persistente `empresta_pg_data`. O backend usa `DATABASE_URL` quando presente; sem ela (modo local), cai automaticamente para arquivos SQLite.

**Funcionalidades:** cadastro/login de clientes, chat com assistente de IA (Google Gemini) para solicitar empréstimos, painel admin com gestão de empréstimos (baixa de devolução) e CRUD de equipamentos.

---

## Pré-requisitos

| Requisito | Versão | Verificar com |
|---|---|---|
| Python | 3.12+ | `python --version` |
| Node.js | 20+ | `node --version` |
| Docker (opcional) | qualquer | `docker --version` |

> **Windows sem Node instalado?** Você pode instalar o Node via `pip install nodejs-wheel-binaries` e executar o Vite/npm através do binário dentro de `...\Python313\Lib\site-packages\nodejs_wheel\` (veja "Solução de problemas").

---

## Opção A — Rodando localmente (sem Docker)

### 1. Backend (FastAPI)

```bash
cd backend

# (recomendado) criar ambiente virtual
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
```

Crie o arquivo `backend/.env` (não é versionado) com base no `.env.example` da raiz:

```env
# Chave de API do Google Gemini (https://aistudio.google.com) — sem ela o chat responde com erro
GEMINI_API_KEY=sua_chave_aqui

# Modelo do Gemini (opcional; default já configurado no código)
# GEMINI_MODEL=gemini-3.5-flash-lite

# Segredo para assinar os tokens JWT (string aleatória longa)
JWT_SECRET=troque_por_uma_string_secreta_longa

# Credenciais do administrador do painel
ADMIN_USER=admin
ADMIN_PASSWORD=escolha_uma_senha_forte

# Opcional — para apontar o backend a um PostgreSQL em vez dos arquivos SQLite:
# DATABASE_URL=postgresql+psycopg2://empresta:empresta_dev_password@localhost:5432/empresta
```

> Sem `GEMINI_API_KEY` válida o sistema funciona (login, painel, CRUD), mas o chat de IA responde com a mensagem de erro amigável.

Inicie o servidor:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Verifique: `curl http://localhost:8000/health` → `{"status":"ok"}`.

> Na primeira execução, o backend **cria automaticamente** as tabelas (no PostgreSQL se `DATABASE_URL` estiver definida; senão, em arquivos SQLite em `backend/data/`) e semeia o catálogo com 6 equipamentos de exemplo (paquímetro, multímetro, osciloscópio, EPIs...).

### 2. Frontend (React + Vite)

Em **outro terminal**:

```bash
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:5173**

O Vite já está configurado com proxy: toda chamada `/api` do frontend é redirecionada para `http://localhost:8000`.

### 3. Primeiro uso

| O que fazer | Onde | Como |
|---|---|---|
| **Entrar como cliente** | `/register` | Cadastre-se (nome, email, telefone, matrícula, senha) e faça login em `/login` |
| **Entrar como admin** | `/admin/login` | Use `ADMIN_USER` e `ADMIN_PASSWORD` definidos no `backend/.env` (com os valores definidos no seu `.env`) |
| **Chat de empréstimos** | `/chat` | Logado como cliente, peça ex.: *"tem multímetro disponível?"* |
| **Painel de empréstimos** | `/admin` | Logado como admin: veja empréstimos ativos e baixe devoluções |
| **Gestão de estoque** | `/admin/equipamentos` | Logado como admin: criar, editar e excluir equipamentos |

---

## Opção B — Rodando com Docker Compose (validada)

### Como a stack funciona

| Container | Imagens | Papel | Porta |
|---|---|---|---|
| `empresta_db` | `postgres:16-alpine` | Banco PostgreSQL com healthcheck (`pg_isready`) | interno |
| `empresta_backend` | build em `python:3.12-slim` | API FastAPI (uvicorn); sobe só após o banco saudável | 8000 |
| `empresta_frontend` | build em `node:20-alpine` → serve com `nginx:alpine` | Serve o build do React e faz proxy de `/api` → `backend:8000` | 80 |

Os dados ficam no volume `empresta_pg_data` — persistem entre `docker compose down` / `up`. As credenciais do banco vêm do `.env` (`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`, defaults `empresta` / `empresta_dev_password` / `empresta`).

### 0. Pré-requisitos no Windows (uma vez só)

No Windows 10/11 **Home** o Docker Desktop usa o backend WSL2. Se ainda não há Docker na máquina:

```powershell
# 1) Habilitar os recursos do Windows (pede elevação; exige REINICIAR o Windows depois)
dism /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
wsl --install --no-distribution
# → reinicie o Windows antes de continuar

# 2) Instalar o Docker Desktop
winget install --id Docker.DockerDesktop --exact --silent --accept-package-agreements
```

> A virtualização precisa estar habilitada na BIOS/UEFI. Confira com:
> `(Get-CimInstance Win32_Processor).VirtualizationFirmwareEnabled` → deve ser `True`.

Se após ligar a máquina o comando `docker version` não responder, inicie o engine manualmente e aguarde ~15 segundos:

```powershell
Start-Process 'C:\Program Files\Docker\Docker\resources\com.docker.backend.exe' -ArgumentList '-owner-docker-desktop'
```

> **Após reiniciar o Windows**, o engine não sobe sozinho: abra o Docker Desktop (ou use o comando acima) e aguarde `docker info` responder antes de rodar `docker compose up -d`. Para verificar: `docker info --format '{{.ServerVersion}}'` deve imprimir a versão do engine.

### 1. Configure o `.env` da raiz

O `docker-compose.yml` lê as variáveis de um arquivo **`.env` na raiz do projeto** (não versionado):

```env
GEMINI_API_KEY=sua_chave_aqui
JWT_SECRET=troque_por_uma_string_secreta_longa
ADMIN_USER=admin
ADMIN_PASSWORD=escolha_uma_senha_forte
# GEMINI_MODEL=gemini-3.5-flash-lite  (opcional; o backend já usa este por padrão)

# Banco PostgreSQL (defaults abaixo; mude a senha para produção!)
POSTGRES_USER=empresta
POSTGRES_PASSWORD=empresta_dev_password
POSTGRES_DB=empresta
```

### 2. Suba a stack

```bash
docker compose up -d --build
```

> O primeiro build baixa ~200 MB de imagens base. No primeiro start o backend cria as tabelas e semeia o catálogo com 6 equipamentos automaticamente.

### 3. Acesse

| Serviço | URL |
|---|---|
| **Aplicação (frontend + API via proxy)** | http://localhost |
| API do backend (direto) | http://localhost:8000 |
| Documentação interativa (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/health → `{"status":"ok"}` |

Login admin: `/admin/login` com `ADMIN_USER` / `ADMIN_PASSWORD` do `.env` da raiz.

### ✅ O que foi validado nesta stack (end-to-end)

- Containers `empresta_backend` e `empresta_frontend` estáveis, sem restarts;
- SPA servida pelo Nginx com fallback de rotas (`/` e `/admin/login` → 200);
- Proxy `/api` → backend (`/api/health` → `{"status":"ok"}`);
- Login admin com emissão de JWT; catálogo semeado com os 6 equipamentos;
- CRUD completo de equipamentos (`POST` 201 → `PUT` 200 → `DELETE` 204);
- Interface navegada em navegador real (login → dashboard → gestão de estoque), console limpo.

### ⚠️ Pegadinha conhecida: BOM no `nginx.conf` derruba o Nginx

Se o `frontend/nginx.conf` for salvo com **BOM UTF-8** (comum em editores no Windows), o Nginx não sobe e o container entra em loop de restart:

```
nginx: [emerg] unknown directive "﻿server" in /etc/nginx/conf.d/default.conf:1
```

O caractere invisível `U+FEFF` antes de `server {` invalida a diretiva. Diagnóstico e correção:

```bash
docker logs empresta_frontend          # mostra o erro acima
head -c 3 frontend/nginx.conf | od -c  # deve mostrar `s e r`; se aparecer `357 273 277`, há BOM
```

Salve o arquivo como **"UTF-8 sem BOM"** e recrie o container: `docker compose up -d --build frontend`. Os arquivos do repositório já estão sem BOM — o problema só reaparece se alguém regravar o arquivo com "UTF-8 com BOM" no editor.

> Relacionado: o atributo `version:` no `docker-compose.yml` é obsoleto no Compose v2 (gera *warning*); o arquivo atual já está sem ele.

### Comandos do dia a dia

| Comando | Efeito |
|---|---|
| `docker compose up -d --build` | Rebuilda e sobe a stack (use após mudar código) |
| `docker compose ps` | Estado dos containers |
| `docker compose logs -f backend` | Logs ao vivo do backend |
| `docker compose down` | Para e remove os containers (dados persistem) |
| `docker compose down -v` | Para e **apaga o banco** (remove o volume `empresta_pg_data`) |
| `docker compose restart frontend` | Reinicia o Nginx — use se o `/api` responder 502 após o backend ser recriado (IP antigo em cache) |

> Mudou algo no `.env` da raiz? Recrie os containers com `docker compose up -d` — variáveis de ambiente são injetadas na criação, não em `restart`.

### Migração dos dados legados (SQLite → PostgreSQL)

A stack anterior guardava os dados em arquivos SQLite no volume `empresta_db_data`. Se esse volume ainda existe e você quer preservar os dados, use o script idempotente (com a stack nova no ar):

```bash
docker run --rm --network empresta-lab_empresta_net \
  -v empresta_db_data:/legacy:ro \
  -v "$PWD/backend:/src" -w //src -e PYTHONPATH=//src \
  -e DATABASE_URL='postgresql+psycopg2://empresta:empresta_dev_password@db:5432/empresta' \
  -e SQLITE_ESTOQUE_URL='sqlite:////legacy/estoque.db' \
  -e SQLITE_EMPRESTIMOS_URL='sqlite:////legacy/emprestimos.db' \
  python:3.12-slim sh -c \
  "pip install -q sqlalchemy==2.0.35 psycopg2-binary==2.9.9 && python scripts/migrate_sqlite_to_postgres.py"
```

Ele copia equipamentos, clientes e empréstimos (registros já existentes são ignorados) e ajusta as sequências de id. Histórico de clientes já removidos entra com `cliente_id NULL` — a mesma semântica da regra de remoção pós-devolução. Execute quantas vezes quiser; ele não duplica nada. (Em Git Bash no Windows, use `MSYS_NO_PATHCONV=1` antes do `docker run` para os caminhos `/src` não serem reescritos.)

---

## Rodando os testes

```bash
# Backend — 16 testes (modelos + API de integração, sem rede real)
cd backend
python -m pytest tests/ -v

# Frontend — 35 testes (componentes, APIs mockadas)
cd frontend
npm test
```

---

## Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Chat responde *"ocorreu um erro ao se comunicar com o assistente"* | `GEMINI_API_KEY` ausente/inválida no `backend/.env` | Coloque uma chave válida e reinicie o backend |
| Login admin falha com credenciais corretas | `ADMIN_PASSWORD` no `.env` difere da que você digitou (ou `.env` inexistente → senha vazia) | Conferir/criar `backend/.env` e reiniciar o backend |
| Erro *"no such table"* / painel vazio demais | Banco corrompido ou apagado com servidor rodando | Pare o backend, apague `backend/data/*.db` se quiser recomeçar; o startup recria tudo |
| Porta 5173 ou 8000 ocupada | Outro processo (ou o preview de dev) usando a porta | Mude a porta: `npm run dev -- --port 5174` e ajuste `proxy.target` em `frontend/vite.config.ts` para a porta do backend |
| Frontend carrega mas API dá erro de conexão | Backend não está rodando | Suba o backend primeiro (`uvicorn` na 8000) |
| Container `empresta_frontend` reinicia em loop com `unknown directive "﻿server"` | BOM UTF-8 no `nginx.conf` | Salve o arquivo como UTF-8 **sem BOM** e rode `docker compose up -d --build frontend` (detalhes na seção Docker) |
| `docker version` mostra só o client / falha ao conectar no pipe | Engine do Docker Desktop não subiu após o boot | Inicie o `com.docker.backend.exe` conforme a seção Docker e aguarde ~15 s |
| Chat falha com `404 ... model ... is no longer available` | O modelo do Gemini configurado foi aposentado pelo Google | Defina `GEMINI_MODEL` no `.env` com um modelo atual (ex.: `gemini-3.5-flash-lite`) e recrie os containers |
| Windows: `npm` não encontrado | Node não instalado no PATH | `pip install nodejs-wheel-binaries` e rode `node C:\Users\user\AppData\Local\Programs\Python\Python313\Lib\site-packages\nodejs_wheel\lib\node_modules\npm\bin\npm-cli.js install` dentro de `frontend/`, e o Vite com `node node_modules\vite\bin\vite.js` |
| `/api` responde **502 Bad Gateway** após o backend ser recriado | O Nginx cacheou o IP antigo do container backend | `docker compose restart frontend` |
| Backend não conecta ao banco (`connection refused` / `could not translate host name "db"`) | Container `db` não está saudável ainda (ou caiu) | `docker compose ps` — espere o healthcheck ficar `healthy`; o backend re-tenta automaticamente |

---

## Resumo rápido (TL;DR)

```bash
# Backend
cd backend && pip install -r requirements.txt
cp ../.env.example .env   # edite GEMINI_API_KEY, JWT_SECRET e ADMIN_PASSWORD
python -m uvicorn app.main:app --reload --port 8000

# Frontend (outro terminal)
cd frontend && npm install && npm run dev
# → http://localhost:5173   (admin: /admin/login com o ADMIN_PASSWORD do .env)

# Alternativa única, com Docker (usa o .env da raiz)
docker compose up -d --build
# → http://localhost        (admin: /admin/login com o ADMIN_PASSWORD do .env)
```
