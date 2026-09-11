import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import LoginCliente from '../pages/LoginCliente'
import { AuthProvider } from '../context/AuthContext'
import api from '../api/client'

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

const renderLoginPage = () =>
  render(
    <AuthProvider>
      <BrowserRouter>
        <LoginCliente />
      </BrowserRouter>
    </AuthProvider>,
  )

describe('Tela de Login do Cliente', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
    localStorage.clear()
  })

  it('renderiza os campos de matrícula e senha', () => {
    renderLoginPage()

    expect(screen.getByLabelText(/matrícula/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('exibe mensagem de erro ao falhar na autenticação', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Credenciais inválidas.' } },
    })

    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/matrícula/i), { target: { value: 'RA999' } })
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'errada' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByText(/matrícula ou senha incorretos/i)).toBeInTheDocument()
    })
    expect(api.post).toHaveBeenCalledWith('/auth/cliente/login', {
      matricula: 'RA999',
      senha: 'errada',
    })
  })
})
