import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginCliente() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const { data } = await api.post('/auth/cliente/login', {
        matricula,
        senha,
      })
      login(data.access_token, 'cliente')
      navigate('/chat')
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setErro('Matrícula ou senha incorretos. Verifique seus dados e tente novamente.')
      } else if (err?.response?.status === 400) {
        setErro('Dados inválidos. Verifique os campos informados.')
      } else if (err?.request) {
        setErro('Não foi possível conectar ao servidor. Tente novamente em instantes.')
      } else {
        setErro('Erro inesperado ao entrar. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="auth-page">
      <h2>Entrar</h2>
      <p className="auth-subtitle">Acesse sua conta para solicitar empréstimos.</p>

      {erro && (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="matricula">Matrícula / RA</label>
          <input
            id="matricula"
            name="matricula"
            type="text"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            placeholder="Ex.: RA12345"
            autoComplete="username"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            name="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
            required
          />
        </div>

        <button className="btn-primary" type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="auth-switch">
        Ainda não tem conta? <Link to="/register">Cadastre-se</Link>
      </p>
    </section>
  )
}
