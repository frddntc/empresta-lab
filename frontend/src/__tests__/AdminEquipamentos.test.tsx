import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminEquipamentos from '../pages/AdminEquipamentos'
import { AuthProvider } from '../context/AuthContext'
import api from '../api/client'

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const catalogo = [
  {
    id: 1,
    nome: 'Multímetro Digital',
    descricao: 'Medição de tensão e corrente',
    categoria: 'Elétrica',
    quantidade: 5,
  },
  {
    id: 2,
    nome: 'Osciloscópio',
    descricao: null,
    categoria: 'Eletrônica',
    quantidade: 2,
  },
]

const renderPagina = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <AdminEquipamentos />
      </MemoryRouter>
    </AuthProvider>,
  )

const preencherFormulario = (overrides: Record<string, string> = {}) => {
  const campos = {
    nome: 'Fonte de Alimentação',
    categoria: 'Elétrica',
    quantidade: '3',
    descricao: 'Fonte DC ajustável 0-30V',
    ...overrides,
  }
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: campos.nome } })
  fireEvent.change(screen.getByLabelText(/categoria/i), { target: { value: campos.categoria } })
  fireEvent.change(screen.getByLabelText(/quantidade em estoque/i), {
    target: { value: campos.quantidade },
  })
  fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: campos.descricao } })
  fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
}

describe('Gestão de Estoque — Equipamentos', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
    vi.mocked(api.put).mockReset()
    vi.mocked(api.delete).mockReset()
    localStorage.clear()
    localStorage.setItem('token', 'token-admin')
    localStorage.setItem('role', 'admin')
  })

  it('carrega e lista o catálogo de equipamentos', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: catalogo })

    renderPagina()

    expect(await screen.findByText(/multímetro digital/i)).toBeInTheDocument()
    expect(screen.getByText(/osciloscópio/i)).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/equipamentos')
    // Descrição nula cai no placeholder '-'.
    expect(screen.getByText('-')).toBeInTheDocument()
    // A tabela não expõe o ID do equipamento.
    expect(screen.queryByText('#1')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /id/ })).not.toBeInTheDocument()
  })

  it('cadastra um novo equipamento e recarrega a lista', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: catalogo })
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 3 } })

    renderPagina()

    fireEvent.click(await screen.findByRole('button', { name: /novo equipamento/i }))
    const modal = screen.getByRole('dialog', { name: /novo equipamento/i })
    expect(modal).toBeInTheDocument()

    preencherFormulario()

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/equipamentos', {
        nome: 'Fonte de Alimentação',
        descricao: 'Fonte DC ajustável 0-30V',
        categoria: 'Elétrica',
        quantidade: 3,
      })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('edita um equipamento preenchendo o modal com os valores atuais', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: catalogo })
    vi.mocked(api.put).mockResolvedValueOnce({ data: { id: 1 } })

    renderPagina()

    const linha = (await screen.findByText(/multímetro digital/i)).closest('tr')!
    fireEvent.click(within(linha).getByRole('button', { name: /editar/i }))

    const modal = screen.getByRole('dialog', { name: /editar equipamento/i })
    expect(within(modal).getByLabelText(/nome/i)).toHaveValue('Multímetro Digital')
    expect(within(modal).getByLabelText(/categoria/i)).toHaveValue('Elétrica')
    expect(within(modal).getByLabelText(/quantidade em estoque/i)).toHaveValue(5)

    fireEvent.change(within(modal).getByLabelText(/quantidade em estoque/i), {
      target: { value: '8' },
    })
    fireEvent.click(within(modal).getByRole('button', { name: /^salvar$/i }))

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/equipamentos/1', {
        nome: 'Multímetro Digital',
        descricao: 'Medição de tensão e corrente',
        categoria: 'Elétrica',
        quantidade: 8,
      })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('bloqueia quantidade negativa e exibe erro sem enviar a requisição', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: catalogo })

    renderPagina()

    fireEvent.click(await screen.findByRole('button', { name: /novo equipamento/i }))
    preencherFormulario({ quantidade: '-1' })

    expect(await screen.findByText(/a quantidade não pode ser negativa/i)).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('exclui um equipamento após confirmação', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: catalogo })
    vi.mocked(api.delete).mockResolvedValueOnce({ status: 204 })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderPagina()

    const linha = (await screen.findByText(/multímetro digital/i)).closest('tr')!
    fireEvent.click(within(linha).getByRole('button', { name: /excluir/i }))

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/equipamentos/1')
    })
    expect(screen.queryByText(/multímetro digital/i)).not.toBeInTheDocument()
    expect(screen.getByText(/osciloscópio/i)).toBeInTheDocument()
  })

  it('não exclui quando a confirmação é cancelada', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: catalogo })
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderPagina()

    const linha = (await screen.findByText(/multímetro digital/i)).closest('tr')!
    fireEvent.click(within(linha).getByRole('button', { name: /excluir/i }))

    expect(api.delete).not.toHaveBeenCalled()
    expect(screen.getByText(/multímetro digital/i)).toBeInTheDocument()
  })
})
