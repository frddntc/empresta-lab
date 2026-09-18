import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import AdminLogin from '../pages/AdminLogin'
import { AuthProvider } from '../context/AuthContext'
import api from '../api/client'

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

const renderAdminLogin = () =>
  render(
    <AuthProvider>
      <BrowserRouter>
        <AdminLogin />
      </BrowserRouter>
    </AuthProvider>,
  )

describe('Tela de Login do Administrador', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
    localStorage.clear()
  })

  it('renderiza os campos de usuário e senha', () => {
    renderAdminLogin()

    expect(screen.getByLabelText(/usuário admin/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /entrar como administrador/i }),
    ).toBeInTheDocument()
  })

  it('envia as credenciais e armazena o token de admin no login válido', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { access_token: 'token-admin-123' },
    })

    renderAdminLogin()

    fireEvent.change(screen.getByLabelText(/usuário admin/i), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'senha-forte' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar como administrador/i }))

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('token-admin-123')
    })
    expect(localStorage.getItem('role')).toBe('admin')
    expect(api.post).toHaveBeenCalledWith('/auth/admin/login', {
      usuario: 'admin',
      senha: 'senha-forte',
    })
  })

  it('exibe mensagem amigável quando as credenciais são inválidas', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Credenciais de admin inválidas.' } },
    })

    renderAdminLogin()

    fireEvent.change(screen.getByLabelText(/usuário admin/i), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'errada' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar como administrador/i }))

    await waitFor(() => {
      // O componente prioriza o `detail` retornado pelo backend.
      expect(screen.getByText(/credenciais de admin inválidas/i)).toBeInTheDocument()
    })
    // Nada deve ser salvo no storage quando o login falha.
    expect(localStorage.getItem('token')).toBeNull()
  })
})
