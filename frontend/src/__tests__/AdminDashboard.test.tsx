import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminDashboard from '../pages/AdminDashboard'
import { AuthProvider } from '../context/AuthContext'
import api from '../api/client'

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

const emprestimosAtivos = [
  {
    id: 1,
    cliente_id: 10,
    equipamento_id: 2,
    nome_equipamento: 'Multímetro Digital',
    quantidade: 2,
    data_emprestimo: '2026-08-20',
    prazo_devolucao: '2026-09-01',
    devolvido: false,
    cliente: {
      id: 10,
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      telefone: '11999990000',
      matricula: 'RA12345',
    },
  },
  {
    id: 2,
    cliente_id: 11,
    equipamento_id: 3,
    nome_equipamento: 'Osciloscópio',
    quantidade: 1,
    data_emprestimo: '2026-09-10',
    prazo_devolucao: '2027-09-10',
    devolvido: false,
    cliente: {
      id: 11,
      nome: 'João Souza',
      email: 'joao@exemplo.com',
      telefone: '11888880000',
      matricula: 'RA67890',
    },
  },
]

const renderDashboard = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    </AuthProvider>,
  )

describe('Painel Administrativo — Empréstimos', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.put).mockReset()
    localStorage.clear()
    localStorage.setItem('token', 'token-admin')
    localStorage.setItem('role', 'admin')
  })

  it('carrega e lista os empréstimos ativos com status e prazo', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: emprestimosAtivos })

    renderDashboard()

    // Estado de carregando antes da resposta.
    expect(screen.getByText(/carregando empréstimos/i)).toBeInTheDocument()

    expect(await screen.findByText(/multímetro digital/i)).toBeInTheDocument()
    expect(screen.getByText(/osciloscópio/i)).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/emprestimos')

    // Dados do cliente fornecidos ao agente aparecem na listagem.
    expect(screen.getByText(/maria silva/i)).toBeInTheDocument()
    expect(screen.getByText(/ra12345 · maria@exemplo\.com · 11999990000/i)).toBeInTheDocument()
    expect(screen.getByText(/joão souza/i)).toBeInTheDocument()
    expect(screen.getByText(/ra67890 · joao@exemplo\.com · 11888880000/i)).toBeInTheDocument()

    // Prazo do empréstimo 1 está no passado → Vencido; o 2 está no futuro → No Prazo.
    expect(screen.getByText('Vencido')).toBeInTheDocument()
    expect(screen.getByText('No Prazo')).toBeInTheDocument()
  })

  it('exibe estado vazio quando não há empréstimos ativos', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] })

    renderDashboard()

    expect(await screen.findByText(/nenhum empréstimo ativo/i)).toBeInTheDocument()
  })

  it('exibe erro amigável quando a listagem falha', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('network down'))

    renderDashboard()

    expect(await screen.findByText(/erro ao carregar lista de empréstimos/i)).toBeInTheDocument()
  })

  it('registra a devolução e remove a linha da tabela', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: emprestimosAtivos })
    vi.mocked(api.put).mockResolvedValueOnce({ data: { ok: true } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderDashboard()

    const linha = (await screen.findByText(/multímetro digital/i)).closest('tr')!
    fireEvent.click(within(linha).getByRole('button', { name: /baixar devolução/i }))

    await waitFor(() => {
      expect(screen.getByText(/devolução registrada com sucesso/i)).toBeInTheDocument()
    })
    expect(api.put).toHaveBeenCalledWith('/emprestimos/1/devolver')
    expect(screen.queryByText(/multímetro digital/i)).not.toBeInTheDocument()
    expect(screen.getByText(/osciloscópio/i)).toBeInTheDocument()
  })

  it('não registra devolução quando a confirmação é cancelada', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: emprestimosAtivos })
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderDashboard()

    const linha = (await screen.findByText(/multímetro digital/i)).closest('tr')!
    fireEvent.click(within(linha).getByRole('button', { name: /baixar devolução/i }))

    expect(api.put).not.toHaveBeenCalled()
    expect(screen.getByText(/multímetro digital/i)).toBeInTheDocument()
  })
})
