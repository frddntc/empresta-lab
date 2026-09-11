import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { FlaskConical, LogOut } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import LoginCliente from './pages/LoginCliente'
import RegisterCliente from './pages/RegisterCliente'
import { Chat } from './pages/Chat'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminEquipamentos from './pages/AdminEquipamentos'

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
            <Route element={<ProtectedRoute />}>
              <Route path="/chat" element={<Chat />} />
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
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="app-header">
      <Link to="/" className="app-brand">
        <FlaskConical size={28} />
        <h1>Empresta Lab</h1>
      </Link>
      {isAuthenticated && (
        <button className="btn-ghost" onClick={handleLogout} aria-label="Sair da conta">
          <LogOut size={18} />
          Sair
        </button>
      )}
    </header>
  )
}

function Home() {
  return (
    <section>
      <h2>Bem-vindo ao Empresta Lab</h2>
      <p>
        Sistema de empréstimo de equipamentos de laboratório. Faça{' '}
        <Link to="/login">login</Link> ou <Link to="/register">cadastre-se</Link>{' '}
        para solicitar empréstimos pelo chat.
      </p>
    </section>
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
