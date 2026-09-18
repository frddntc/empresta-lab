# API REST

Referência dos endpoints do backend FastAPI. Base URL em produção: `http://localhost/api` (Nginx remove o prefixo e encaminha ao backend); em desenvolvimento: `http://localhost:8000` (direto) ou `http://localhost:5173/api` (proxy do Vite).

- Autenticação: `Authorization: Bearer <token>` (JWT HS256, expira em 15 min).
- Erros de autenticação: **401** (token ausente — responde 403 pelo `HTTPBearer` do FastAPI — inválido ou expirado), **403** (role diferente do exigido).
- Documentação interativa: `http://localhost/api/docs` (Swagger UI).

---

## Autenticação — `/auth`

### `POST /auth/cliente/register` — cadastro de cliente

```json
// Request
{
  "nome": "Nina Silva",
  "email": "nina@exemplo.com",
  "telefone": "11999990000",
  "matricula": "RA123",
  "senha": "senha123"
}
```
- `201` — `{"mensagem": "Cliente cadastrado com sucesso."}`
- `400` — `{"detail": "Matrícula já cadastrada."}`
- A senha é armazenada como hash bcrypt (`senha_hash`); nunca é retornada.

### `POST /auth/cliente/login` — login do cliente

```json
// Request
{ "matricula": "RA123", "senha": "senha123" }
```
```json
// 200
{ "access_token": "eyJhbGciOi...", "token_type": "bearer" }
```
- `401` — `{"detail": "Credenciais inválidas."}`
- O token carrega `sub=matricula`, `role=cliente`.

### `POST /auth/admin/login` — login do administrador

```json
// Request — campos em português mesmo
{ "usuario": "admin", "senha": "valor-de-ADMIN_PASSWORD-do-.env" }
```
```json
// 200
{ "access_token": "eyJhbGciOi...", "token_type": "bearer" }
```
- `401` — `{"detail": "Credenciais de admin inválidas."}`
- Não consulta banco: compara com `ADMIN_USER`/`ADMIN_PASSWORD` do ambiente. Token com `role=admin`.

---

## Equipamentos — `/equipamentos` *(todas exigem admin)*

| Método | Rota | Descrição | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/equipamentos` | Lista todo o catálogo | `200` lista | — |
| GET | `/equipamentos/{id}` | Detalha um equipamento | `200` | `404` não encontrado |
| POST | `/equipamentos` | Cria equipamento | `201` | — |
| PUT | `/equipamentos/{id}` | Atualiza campos enviados (partial update) | `200` | `404` |
| DELETE | `/equipamentos/{id}` | Remove equipamento | `204` sem corpo | `404` |

```json
// POST /equipamentos — request
{
  "nome": "Osciloscópio Digital",
  "descricao": "2 canais, 100 MHz",
  "categoria": "Medição",
  "quantidade": 2
}
```
```json
// Resposta (POST/PUT/GET individual)
{
  "id": 7,
  "nome": "Osciloscópio Digital",
  "descricao": "2 canais, 100 MHz",
  "categoria": "Medição",
  "quantidade": 2
}
```

Regra de integridade no banco: `CHECK (quantidade >= 0)`.

---

## Empréstimos — `/emprestimos`

### `GET /emprestimos` *(admin)* — empréstimos ativos do painel

```json
// 200
[
  {
    "id": 12,
    "cliente_id": 3,
    "equipamento_id": 2,
    "nome_equipamento": "Multímetro Digital",
    "quantidade": 1,
    "data_emprestimo": "2026-09-18",
    "prazo_devolucao": "2026-10-18",
    "devolvido": false,
    "data_devolucao": null,
    "cliente": {
      "id": 3, "nome": "Nina Silva", "email": "nina@exemplo.com",
      "telefone": "11999990000", "matricula": "RA123"
    }
  }
]
```
- Lista **apenas `devolvido=false`**, com o objeto `cliente` aninhado (dados que o cliente forneceu ao agente) via `joinedload` (sem N+1). `senha_hash` nunca é exposto.
- Alimenta o Painel Administrativo — quem está com cada equipamento e até quando.

### `GET /emprestimos/me` *(cliente)* — meus empréstimos ativos

- Exige `role=cliente` (admin recebe `403`).
- Vínculo: matrícula do token → `clientes` → empréstimos com `devolvido=false`, ordenados por `prazo_devolucao`.
- Mesmo formato do `GET /emprestimos`; lista vazia se não houver nenhum.
- Alimenta a página "Acompanhar empréstimos ativos" do frontend.

### `POST /emprestimos` *(admin)* — registrar empréstimo

```json
// Request
{
  "equipamento_id": 2,
  "quantidade": 1,
  "nome": "Nina Silva",
  "email": "nina@exemplo.com",
  "telefone": "11999990000",
  "matricula": "RA123",
  "prazo_dias": 30
}
```
- `201` — objeto criado (formato acima).
- `404` — `"Equipamento não encontrado."` ou `"Cliente não encontrado. Realize o cadastro primeiro."` (validado **antes** de tocar no estoque).
- `409` — `{"detail": "Estoque insuficiente. Disponível: 0."}`
- Efeitos: subtrai `quantidade` do estoque e cria o registro com `prazo_devolucao = hoje + prazo_dias`.
- É o endpoint chamado pela ferramenta `registrar_emprestimo` do agente.

### `PUT /emprestimos/{id}/devolver` *(admin)* — registrar devolução

- `200` — objeto atualizado (`devolvido=true`, `data_devolucao=hoje`, `cliente` ainda aninhado).
- `404` — não encontrado · `400` — `"Empréstimo já devolvido."`
- Efeitos: restaura a quantidade no estoque (se o equipamento ainda existir) e marca o registro.
- **O cadastro do cliente permanece na base** (regra vigente: cadastro permanente — login ativo e ID vitalício). Os empréstimos devolvidos ficam como histórico com `cliente_id` preenchido.

---

## Chat — `/chat`

### `POST /chat` *(cliente)* — conversa com o agente

```json
// Request
{
  "message": "tem multímetro disponível?",
  "history": [
    { "role": "user", "text": "olá" },
    { "role": "model", "text": "Olá! Em que posso ajudar?" }
  ]
}
```
```json
// 200
{ "reply": "Sim! Temos 3 unidades de Multímetro Digital. Deseja prosseguir com o empréstimo?" }
```
- Stateful do lado do cliente: cada requisição envia o histórico completo.
- O backend roda o loop de function calling com o Gemini (ver [Arquitetura](arquitetura.md)); as ferramentas executam contra o banco real.
- Sem `GEMINI_API_KEY` válida, responde com mensagem de erro amigável — o restante do sistema não é afetado.
- `403` — sem token de cliente (o `HTTPBearer` responde 403 quando não há header).

---

## Infra

### `GET /health`

```json
{ "status": "ok" }
```
Health check sem autenticação (usado por humanos e monitoramento).

---

## Erros — convenção

FastAPI devolve `{"detail": "mensagem"}` (string) para erros de negócio e `{"detail": [{...}]}` (lista) para erros de validação do Pydantic — ex.: enviar `username` em vez de `usuario` no login admin. Códigos usados: `400` regra violada, `401` credenciais, `403` role errado, `404` não encontrado, `409` conflito de estoque.
