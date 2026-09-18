# Modelo de dados

Como o Empresta Lab organiza seus dados: três tabelas, um banco PostgreSQL em produção (volume `empresta_pg_data`) e as regras de negócio que governam o ciclo de vida de clientes e empréstimos.

---

## Visão geral

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  equipamentos (estoque) │         │  clientes                │
│─────────────────────────│         │──────────────────────────│
│  id            PK       │         │  id            PK        │
│  nome                   │  lógica │  nome                    │
│  descricao              │◄────────│  email                   │
│  categoria              │ (service│  telefone                │
│  quantidade  CHECK >= 0 │  layer) │  matricula    UNIQUE     │
└─────────────────────────┘         │  senha_hash  (bcrypt)    │
                                    └────────────┬─────────────┘
                                                 │ FK nativa
                                                 │ ON DELETE SET NULL
                                    ┌────────────┴─────────────┐
                                    │  emprestimos             │
                                    │──────────────────────────│
                                    │  id            PK        │
                                    │  cliente_id  FK, NULL?   │
                                    │  equipamento_id  INT     │
                                    │  nome_equipamento        │
                                    │  quantidade  CHECK > 0   │
                                    │  data_emprestimo         │
                                    │  prazo_devolucao         │
                                    │  devolvido               │
                                    │  data_devolucao  NULL?   │
                                    └──────────────────────────┘
```

- **Produção:** PostgreSQL único via `DATABASE_URL`. Os dois "sub-bancos" do design original (estoque e empréstimos) convivem no mesmo schema — as tabelas são independentes.
- **Modo local (sem Docker):** fallback automático para dois arquivos SQLite (`data/estoque.db`, `data/emprestimos.db`). Mesmos modelos, mesmo código.
- **Sem Alembic:** tabelas criadas no startup por `Base.metadata.create_all`.

---

## Tabelas

### `equipamentos` — catálogo de estoque

| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INTEGER | PK, autoincrement | Identificador |
| `nome` | VARCHAR(150) | NOT NULL | Nome de exibição |
| `descricao` | TEXT | nullable | Detalhes técnicos |
| `categoria` | VARCHAR(100) | NOT NULL | Ex.: "Medição", "Segurança" |
| `quantidade` | INTEGER | NOT NULL, `CHECK (quantidade >= 0)` | Unidades disponíveis |

### `clientes` — usuários comuns (perfil + credenciais)

| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INTEGER | PK, autoincrement | Identificador **vitalício** (ver regras) |
| `nome` | VARCHAR(200) | NOT NULL | Nome completo |
| `email` | VARCHAR(200) | NOT NULL | E-mail de contato |
| `telefone` | VARCHAR(20) | NOT NULL | Telefone |
| `matricula` | VARCHAR(50) | NOT NULL, `UNIQUE` | Matrícula/RA — chave de identificação no login e no chat |
| `senha_hash` | VARCHAR(200) | NOT NULL | Hash bcrypt da senha de acesso |

### `emprestimos` — registros de empréstimo (histórico completo)

| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INTEGER | PK, autoincrement | Identificador |
| `cliente_id` | INTEGER | nullable, FK → `clientes.id` `ON DELETE SET NULL` | Cliente do empréstimo |
| `equipamento_id` | INTEGER | NOT NULL (sem FK nativa) | Referência ao catálogo — integridade pela camada de serviço |
| `nome_equipamento` | VARCHAR(150) | NOT NULL | **Desnormalizado** — preserva o nome mesmo se o equipamento for renomeado/excluído |
| `quantidade` | INTEGER | NOT NULL, `CHECK (quantidade > 0)` | Unidades emprestadas |
| `data_emprestimo` | DATE | NOT NULL, default `hoje` | Início |
| `prazo_devolucao` | DATE | NOT NULL | `data_emprestimo + prazo_dias` |
| `devolvido` | BOOLEAN | NOT NULL, default `false` | Marcador de ciclo concluído |
| `data_devolucao` | DATE | nullable | Preenchida na devolução |

---

## Regras de negócio

### 1. Cadastro do cliente é permanente

O cliente, uma vez cadastrado (site ou primeira conversa via agente), **permanece na base para sempre**: mantém login ativo e o **mesmo ID**, tenha ou não empréstimos. A devolução **não** remove o cliente.

- Consequência no chat: em atendimentos futuros, o agente chama `verificar_cliente` com a matrícula e **não repede** nome/e-mail/telefone — usa os dados cadastrados e apenas confirma com o cliente.
- Validado por `test_devolucao_mantem_cliente_na_base`: dois empréstimos → duas devoluções → login segue `200` → mesmo `id` no banco.

### 2. `cliente_id` nullable é defensivo

A FK é `ON DELETE SET NULL`: se um cliente for **eventualmente** removido (manualmente no banco), os empréstimos devolvidos sobrevivem como histórico com `cliente_id NULL`. O schema aninhado `cliente` na API é opcional justamente para tolerar esse caso.

### 3. Estoque como saldo

`quantidade` em `equipamentos` é o saldo disponível: o empréstimo **subtrai**, a devolução **soma de volta**. A integridade é garantida em camada:

- `CHECK (quantidade >= 0)` no banco (nunca fica negativo);
- o serviço valida cliente **antes** de subtrair (empréstimo com matrícula inexistente não consome unidade — retorna 404 com estoque preservado);
- quantidade insuficiente → **409**, sem alterar nada.

### 4. Histórico imutável do empréstimo

`nome_equipamento` é copiado no momento do registro (desnormalização). Renomear ou excluir o equipamento do catálogo não reescreve o passado — a devolução de um equipamento excluído ainda restaura o estoque corretamente (se o `equipamento_id` não existir mais, apenas marca a devolução).

### 5. Prazo definido no registro

`prazo_devolucao = data_emprestimo + prazo_dias` (default 30 dias). O agente informa o prazo ao cliente ao confirmar o empréstimo.

### 6. Devolução é única

Um empréstimo devolvido não pode ser devolvido de novo (400). "Empréstimos ativos" em toda a API significa `devolvido = false` — tanto no painel do admin quanto em `/emprestimos/me`.

---

## Seed

O startup popula o catálogo de forma **idempotente** (verifica por `nome`) com 6 equipamentos:

| Nome | Categoria | Quantidade |
|---|---|---|
| Paquímetro | Medição | 5 |
| Multímetro Digital | Medição | 3 |
| Osciloscópio | Medição | 2 |
| EPI - Óculos de Proteção | Segurança | 10 |
| EPI - Luva Química | Segurança | 8 |
| Termômetro de Infravermelho | Medição | 4 |

---

## Migração de dados legados

Se você possui dados da stack anterior (SQLite no volume `empresta_db_data`), o script `backend/scripts/migrate_sqlite_to_postgres.py` copia equipamentos, clientes e empréstimos para o PostgreSQL (idempotente, ajusta sequências de `id`; histórico de clientes removidos entra com `cliente_id NULL`). Procedimento completo no [setup.md](../setup.md#migração-dos-dados-legados-sqlite--postgresql).
