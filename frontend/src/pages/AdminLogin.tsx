import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    try {
      const res = await api.post('/auth/admin/login', { usuario, senha })
      login(res.data.access_token, 'admin')
      navigate('/admin')
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Credenciais de administrador inválidas.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <section className="auth-page">
      <h2>
        <ShieldCheck size={22} className="admin-title-icon" aria-hidden="true" />
        Painel Administrativo — Acesso
      </h2>
      <p className="auth-subtitle">Área restrita aos administradores do laboratório.</p>

      {erro && (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="usuario">Usuário Admin</label>
          <input
            id="usuario"
            name="usuario"
            type="text"
            required
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="form-field">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            name="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button className="btn-primary" type="submit" disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar como Administrador'}
        </button>
      </form>
    </section>
  )
}
