import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import MeusEmprestimos from '../pages/MeusEmprestimos'
import api from '../api/client'

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

const renderPage = () =>
  render(
    <BrowserRouter>
      <MeusEmprestimos />
    </BrowserRouter>,
  )

describe('Página Acompanhar empréstimos ativos', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('mostra mensagem centralizada quando não há empréstimos ativos', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] })
    renderPage()

    await waitFor(() =>
      expect(screen.getByText(/você não tem nenhum empréstimo ativo/i)).toBeInTheDocument(),
    )
  })

  it('lista os empréstimos ativos retornados pela API', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 7,
          nome_equipamento: 'Multímetro digital',
          quantidade: 2,
          data_emprestimo: '2026-09-10',
          prazo_devolucao: '2026-09-24',
          devolvido: false,
          cliente: { id: 1, nome: 'Maria', email: 'm@x.com', telefone: '11', matricula: 'RA1' },
        },
      ],
    })
    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Multímetro digital')).toBeInTheDocument(),
    )
    expect(screen.getByText('24/09/2026')).toBeInTheDocument()
    expect(screen.getByText('10/09/2026')).toBeInTheDocument()
  })

  it('exibe erro amigável quando a API falha', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('network'))
    renderPage()

    await waitFor(() =>
      expect(screen.getByText(/não foi possível carregar seus empréstimos/i)).toBeInTheDocument(),
    )
  })

  it('tem botão Voltar que leva de volta ao chat quando há empréstimos', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 9,
          nome_equipamento: 'Paquímetro',
          quantidade: 1,
          data_emprestimo: '2026-09-10',
          prazo_devolucao: '2026-09-24',
          devolvido: false,
          cliente: { id: 1, nome: 'Maria', email: 'm@x.com', telefone: '11', matricula: 'RA1' },
        },
      ],
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Paquímetro')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /voltar para o chat com o assistente/i })).toBeInTheDocument()
  })

  it('não exibe botão Voltar no estado vazio (o CTA é "Ir para o chat")', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] })
    renderPage()

    await waitFor(() =>
      expect(screen.getByText(/você não tem nenhum empréstimo ativo/i)).toBeInTheDocument(),
    )
    expect(
      screen.queryByRole('button', { name: /voltar para o chat com o assistente/i }),
    ).not.toBeInTheDocument()
  })
})
