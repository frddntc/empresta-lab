import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

interface FormState {
  nome: string
  email: string
  telefone: string
  matricula: string
  senha: string
}

const FORM_VAZIO: FormState = {
  nome: '',
  email: '',
  telefone: '',
  matricula: '',
  senha: '',
}

export default function RegisterCliente() {
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(FORM_VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function setCampo(campo: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((atual) => ({ ...atual, [campo]: e.target.value }))
  }

  function validar(): string | null {
    if (!form.nome.trim()) return 'Informe seu nome completo.'
    if (!form.email.trim()) return 'Informe seu e-mail.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Informe um e-mail válido.'
    if (!form.telefone.trim()) return 'Informe seu telefone.'
    if (!form.matricula.trim()) return 'Informe sua matrícula/RA.'
    if (form.senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const problema = validar()
    if (problema) {
      setErro(problema)
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      await api.post('/auth/cliente/register', form)
      navigate('/login', {
        state: { mensagem: 'Cadastro realizado com sucesso! Faça login para continuar.' },
      })
    } catch (err: any) {
      if (err?.response?.status === 400) {
        setErro(err?.response?.data?.detail ?? 'Matrícula já cadastrada ou dados inválidos.')
      } else if (err?.response?.status === 422) {
        setErro('Verifique os campos: há dados inválidos ou incompletos.')
      } else if (err?.request) {
        setErro('Não foi possível conectar ao servidor. Tente novamente em instantes.')
      } else {
        setErro('Erro inesperado ao cadastrar. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="auth-page">
      <h2>Criar conta</h2>
      <p className="auth-subtitle">Cadastre-se para solicitar empréstimos de equipamentos.</p>

      {erro && (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="nome">Nome completo</label>
          <input
            id="nome"
            name="nome"
            type="text"
            value={form.nome}
            onChange={setCampo('nome')}
            placeholder="Seu nome completo"
            autoComplete="name"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={setCampo('email')}
            placeholder="voce@exemplo.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="telefone">Telefone</label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            value={form.telefone}
            onChange={setCampo('telefone')}
            placeholder="(11) 99999-0000"
            autoComplete="tel"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="matricula">Matrícula / RA</label>
          <input
            id="matricula"
            name="matricula"
            type="text"
            value={form.matricula}
            onChange={setCampo('matricula')}
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
            value={form.senha}
            onChange={setCampo('senha')}
            placeholder="Mínimo de 6 caracteres"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>

        <button className="btn-primary" type="submit" disabled={enviando}>
          {enviando ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>

      <p className="auth-switch">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </section>
  )
}
