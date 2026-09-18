# Frontend

Como o SPA React do Empresta Lab está organizado: rotas, páginas, autenticação no cliente, tema claro/escuro e convenções de estilo.

---

## Stack e ferramentas

- **React 19 + TypeScript**, build com **Vite**; roteamento com **React Router**; HTTP com **axios**.
- Ícones **lucide-react**; fonte **Inter** (Google Fonts).
- Testes: **Vitest + Testing Library** (35 testes — ver [Testes](testes.md)).

## Rotas

| Rota | Página | Acesso |
|---|---|---|
| `/` | **Home** institucional (hero com foto de laboratório, boxes, CTAs, faixa de suporte) | pública |
| `/login` | Login do cliente (matrícula + senha) | pública, com botão "Voltar" |
| `/register` | Cadastro do cliente | pública, com botão "Voltar" |
| `/chat` | Conversa com o agente + botão "Acompanhar empréstimos" | autenticada |
| `/emprestimos` | Acompanhar empréstimos ativos do próprio cliente | `role=cliente` |
| `/admin/login` | Login do administrador | pública, com botão "Voltar" |
| `/admin` | Painel administrativo (empréstimos ativos + devolução) | `role=admin` |
| `/admin/equipamentos` | Gestão de estoque (CRUD) | `role=admin` |
| `*` | "Página não encontrada" | — |

Rotas protegidas via componente `<ProtectedRoute requiredRole>`: sem sessão → redireciona para `/login`; com role errada → redireciona para a Home.

## Autenticação no cliente

- `AuthContext` guarda `token` e `role` no `localStorage` (`token`, `role`) — a sessão sobrevive a recarregamentos.
- O `api/client.ts` (axios) injeta `Authorization: Bearer <token>` em toda requisição via interceptor.
- O `Header` global decide os botões pela rota e sessão:
  - **Configurações** (todas as páginas): dropdown com alternância de tema.
  - **Voltar**: nas telas de login/cadastro cliente e admin → Home.
  - **Sair**: quando autenticado; abre o popup **"Realmente deseja sair?"** (Sim → limpa sessão e vai à Home; Não → fecha). Em todas as páginas **exceto a Home**, o nome "Empresta Lab" no header também é link de volta.

## Identidade visual

- **Tema claro é o padrão**; o escuro é opcional ("Configurações → Modo escuro"), persiste no `localStorage` (`theme`) e é aplicado pela classe `.theme-dark` no `<html>` antes do primeiro paint (sem flash).
- Paleta da referência visual: primária **rosa `#D91E5B`**, secundária **azul `#5BBDE4`**, navy no tema escuro (`#152336`/`#182840`).
- **Header sem barra de fundo** em todas as páginas — Configurações/Voltar/Sair ficam diretamente sobre a página. Na **Home**, o header é `position: absolute` sobre a foto.
- Botões primários em pílula com glow rosa; cards arredondados (`rounded-2xl`) com hover elevado; título "Empresta Lab" com gradiente duplo rosa→azul.
- Na Home, a foto de **vidraria de laboratório** (`src/assets/lab-hero.jpg`) cobre a janela inteira (`position: fixed`, blur leve) com véu translúcido para contraste; a faixa azul de suporte fica **sempre no fim da página** (`margin-top: auto` no fluxo flex).

## Estrutura de código

```
frontend/src/
├── App.tsx               # rotas + Header global (marca, Configurações, Voltar, Sair + popup)
├── main.tsx              # bootstrap (BrowserRouter + AuthProvider)
├── index.css             # todos os estilos: tokens de tema, layout, componentes, media queries
├── api/
│   └── client.ts         # axios: baseURL '/api' + interceptor de token
├── context/
│   └── AuthContext.tsx   # sessão (token/role no localStorage)
├── components/
│   └── ProtectedRoute.tsx
├── pages/
│   ├── Home.tsx              # hero + boxes + CTAs + suporte
│   ├── LoginCliente.tsx      # matrícula + senha
│   ├── RegisterCliente.tsx   # cadastro (nome, email, telefone, matrícula, senha)
│   ├── Chat.tsx              # chat com o agente (auto-scroll, histórico)
│   ├── MeusEmprestimos.tsx   # /emprestimos — GET /emprestimos/me
│   ├── AdminLogin.tsx        # /admin/login
│   ├── AdminDashboard.tsx    # painel: lista ativos + devolver
│   └── AdminEquipamentos.tsx # CRUD de estoque (sem coluna de ID na tabela)
└── __tests__/             # 35 testes Vitest
```

## Convenções

- **Nenhuma URL absoluta de backend** no código: tudo passa por `/api/...` — o proxy decide o destino (Nginx em produção, Vite em dev).
- Datas exibidas como `dd/mm/aaaa`; badges verdes para "no prazo".
- Estados de carregamento e erro em cada chamada de API (mensagens amigáveis inline).
- Páginas admin exibem os dados do cliente aninhados na resposta de `/emprestimos` (nome, matrícula, e-mail, telefone) — o admin sabe **quem** está com o equipamento.
- Testes cobrem cada página (ver [Testes](testes.md)); ao mudar comportamento visual relevante, atualize o teste e o prompt correspondente em `prompts/03_frontend/`.
