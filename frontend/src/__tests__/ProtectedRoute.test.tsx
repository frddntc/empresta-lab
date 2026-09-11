import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

function PaginaProtegida() {
  return <p>conteúdo protegido</p>
}

function Home() {
  return <p>página inicial</p>
}

function LoginPage() {
  return <p>página de login</p>
}

const renderRotas = (initialPath: string) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Home />} />
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={<PaginaProtegida />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )

describe('Proteção de rotas privadas', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('redireciona para /login quando não autenticado', () => {
    renderRotas('/admin')

    expect(screen.getByText(/página de login/i)).toBeInTheDocument()
    expect(screen.queryByText(/conteúdo protegido/i)).not.toBeInTheDocument()
  })

  it('redireciona para / quando autenticado sem a role exigida', () => {
    localStorage.setItem('token', 'token-cliente')
    localStorage.setItem('role', 'cliente')

    renderRotas('/admin')

    expect(screen.getByText(/página inicial/i)).toBeInTheDocument()
    expect(screen.queryByText(/conteúdo protegido/i)).not.toBeInTheDocument()
  })

  it('renderiza o conteúdo quando autenticado com a role exigida', () => {
    localStorage.setItem('token', 'token-admin')
    localStorage.setItem('role', 'admin')

    renderRotas('/admin')

    expect(screen.getByText(/conteúdo protegido/i)).toBeInTheDocument()
  })
})
