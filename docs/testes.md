# Testes

O projeto tem duas suítes independentes — **16 testes no backend** (pytest) e **35 no frontend** (Vitest) — todas sem rede real: banco SQLite in-memory e Gemini mockado.

---

## Backend — pytest (16 testes)

```bash
cd backend
python -m pytest tests/ -v
```

Arquivos: `tests/conftest.py` (fixtures) · `tests/test_modelos.py` · `tests/test_api.py`.

**Como funciona o ambiente de teste:** o `conftest` sobrepõe as dependências do FastAPI (`get_estoque_db`, `get_emprestimos_db`) para apontar para engines SQLite `:memory:` — nenhum dado de desenvolvimento/produção é tocado. Chamadas ao Gemini são mockadas.

### O que cada teste trava

| Teste | Garante |
|---|---|
| `test_health` | `GET /health` responde `{"status": "ok"}` |
| `test_login_admin_valido` | Login admin emite token com credenciais do ambiente |
| `test_login_cliente_invalido` | Senha errada → 401 |
| `test_criar_e_listar_equipamento` | CRUD básico do catálogo (POST 201 + GET lista) |
| `test_chat_sem_token` | `/chat` sem token → 403 (HTTPBearer) |
| `test_listar_emprestimos_inclui_dados_do_cliente` | Painel exibe o objeto `cliente` aninhado (quem está com o equipamento), sem expor `senha_hash` |
| `test_devolucao_mantem_cliente_na_base` | **Cadastro permanente**: após devoluções, o cliente segue com login ativo (200) e o **mesmo ID** |
| `test_token_expira_em_15_minutos` | Token vence em 15 min (inatividade → novo login) |
| `test_meus_emprestimos_ativos` | `/emprestimos/me` retorna só os ativos do próprio cliente; admin recebe 403 |
| *(demais testes de modelo em `test_modelos.py`)* | Constraints do banco (`CHECK`s), defaults e relacionamentos |

### Erros de negócio cobertos (via cenários acima)

- Estoque insuficiente → 409, sem alterar o banco.
- Empréstimo com matrícula não cadastrada → 404 **antes** de subtrair estoque.
- Devolução dupla → 400.

## Frontend — Vitest + Testing Library (35 testes)

```bash
cd frontend
npm test        # watch: npm run test -- --run
```

Arquivos em `frontend/src/__tests__/`. Todos os testes mockam o módulo `api/client` (axios) — nenhuma chamada real de rede; onde há roteamento, as páginas são renderizadas dentro de `BrowserRouter`/`MemoryRouter`.

| Suíte | Cobre |
|---|---|
| `Home.test.tsx` | Hero, boxes informativos, CTAs (login/cadastro/admin), faixa de suporte |
| `LoginCliente.test.tsx` | Renderização e submissão do formulário |
| `RegisterCliente.test.tsx` | Cadastro com campos obrigatórios |
| `Chat.test.tsx` | Envio de mensagem, exibição da resposta, auto-scroll, link "Acompanhar empréstimos" |
| `MeusEmprestimos.test.tsx` | Tabela com dados; estado vazio ("nenhum empréstimo ativo", sem "Voltar", só "Ir para o chat") |
| `AdminLogin.test.tsx` | Login do administrador |
| `AdminDashboard.test.tsx` | Listagem de ativos com dados do cliente; botão de devolução |
| `AdminEquipamentos.test.tsx` | CRUD: listagem **sem coluna de ID**, criar, editar, excluir |
| `LogoutConfirm.test.tsx` | Popup "Realmente deseja sair?": "Não" fecha mantendo sessão; "Sim" desloga e vai à Home |
| `ProtectedRoute.test.tsx` | Sem sessão → `/login`; role errada → Home; role certa → renderiza |

### Notas de implementação

- **`scrollIntoView` no jsdom** — o `Chat` chama `messagesEndRef.current?.scrollIntoView(...)` no auto-scroll; o jsdom não implementa o método. Corrigido no `setupTests.ts` com `Element.prototype.scrollIntoView = vi.fn()` (padrão da comunidade; não altera código de produção).
- **403 vs 401** — sem header `Authorization`, o `HTTPBearer` do FastAPI responde **403**; os testes registram esse comportamento real da stack.

## Executando tudo antes de um commit

```bash
# Backend
cd backend && python -m pytest tests/ -q          # 16 passed

# Frontend (testes + typecheck + build)
cd frontend && npm test -- --run && npx tsc -b --noEmit && npm run build
```
