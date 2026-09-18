import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, FlaskConical, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import LoginCliente from './pages/LoginCliente'
import RegisterCliente from './pages/RegisterCliente'
import { Chat } from './pages/Chat'
import Home from './pages/Home'
import MeusEmprestimos from './pages/MeusEmprestimos'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminEquipamentos from './pages/AdminEquipamentos'

type Tema = 'light' | 'dark'

function temaInicial(): Tema {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginCliente />} />
            <Route path="/register" element={<RegisterCliente />} />
            <Route path="/register" element={<RegisterCliente />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/chat" element={<Chat />} />
            </Route>
            <Route element={<ProtectedRoute requiredRole="cliente" />}>
              <Route path="/emprestimos" element={<MeusEmprestimos />} />
            </Route>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/equipamentos" element={<AdminEquipamentos />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}

function Header() {
  const { isAuthenticated, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Botão "Voltar" nas telas de autenticação (login/cadastro cliente e admin):
  // única forma do usuário comum retornar à Home a partir do cadastro.
  const mostrarVoltar =
    !isAuthenticated && (pathname === '/login' || pathname === '/register' || pathname === '/admin/login')

  const [configAberto, setConfigAberto] = useState(false)
  const [tema, setTema] = useState<Tema>(temaInicial)
  const [sairPendente, setSairPendente] = useState(false)
  const configRef = useRef<HTMLDivElement>(null)

  // Fecha o dropdown ao clicar fora dele.
  useEffect(() => {
    function fecharAoClicarFora(e: MouseEvent) {
      if (configRef.current && !configRef.current.contains(e.target as Node)) {
        setConfigAberto(false)
      }
    }
    document.addEventListener('mousedown', fecharAoClicarFora)
    return () => document.removeEventListener('mousedown', fecharAoClicarFora)
  }, [])

  function alternarTema() {
    const novo: Tema = tema === 'dark' ? 'light' : 'dark'
    setTema(novo)
    document.documentElement.classList.toggle('theme-dark', novo === 'dark')
    try {
      localStorage.setItem('theme', novo)
    } catch {
      /* localStorage indisponível: tema válido só nesta sessão */
    }
  }

  function handleLogout() {
    // Recarrega direto na home: navegar via roteador após logout deixaria o
    // ProtectedRoute da rota atual vencer e redirecionar para /login.
    setSairPendente(false)
    logout()
    window.location.assign('/')
  }

  // Na Home a marca vive no hero central (a pedido: sem duplicação no topo);
  // nas demais páginas o nome no header é o link de volta à Home.
  const mostrarMarca = pathname !== '/'

  return (
    <>
      <header className="app-header">
      {mostrarMarca && (
        <Link to="/" className="app-brand">
          <FlaskConical size={28} />
          <h1>Empresta Lab</h1>
        </Link>
      )}
      <div className="header-actions" ref={configRef}>
        <div className="config-wrapper">
          <button
            className="btn-ghost btn-config"
            onClick={() => setConfigAberto((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={configAberto}
            aria-label="Abrir configurações"
          >
            <Settings size={18} />
            <span className="btn-label">Configurações</span>
          </button>
          {configAberto && (
            <div className="config-menu" role="menu" aria-label="Preferências">
              <button className="config-item" role="menuitem" onClick={alternarTema}>
                {tema === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {tema === 'dark' ? 'Modo claro' : 'Modo escuro'}
              </button>
            </div>
          )}
        </div>
        {mostrarVoltar && (
          <button
            className="btn-ghost"
            onClick={() => navigate('/')}
            aria-label="Voltar para a página inicial"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
        )}
        {isAuthenticated && (
          <button
            className="btn-ghost btn-sair"
            onClick={() => setSairPendente(true)}
            aria-label="Sair da conta"
          >
            <LogOut size={18} />
            Sair
          </button>
        )}
      </div>
      </header>
      {sairPendente && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirmar-sair-titulo">
          <div className="modal-card confirm-card">
            <h3 id="confirmar-sair-titulo">Realmente deseja sair?</h3>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setSairPendente(false)}>
                Não
              </button>
              <button className="btn-primary" onClick={handleLogout}>
                Sim
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function NotFound() {
  return (
    <section>
      <h2>Página não encontrada</h2>
      <p>A rota acessada não existe.</p>
    </section>
  )
}
