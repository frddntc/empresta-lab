import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { Chat } from '../pages/Chat'
import { AuthProvider } from '../context/AuthContext'
import api from '../api/client'

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

const renderChat = () =>
  render(
    <AuthProvider>
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    </AuthProvider>,
  )

describe('Tela de Chat do Cliente', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
    localStorage.clear()
  })

  it('exibe mensagem inicial de boas-vindas do assistente', () => {
    renderChat()

    expect(screen.getByText(/sou o assistente do empresta lab/i)).toBeInTheDocument()
  })

  it('envia mensagem e exibe a resposta retornada pela API', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { reply: 'Temos 5 paquímetros disponíveis. Deseja prosseguir com o empréstimo?' },
    })

    renderChat()

    const input = screen.getByLabelText(/mensagem para o assistente/i)
    fireEvent.change(input, { target: { value: 'Preciso de um paquímetro' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }))

    await waitFor(() => {
      expect(screen.getByText(/temos 5 paquímetros disponíveis/i)).toBeInTheDocument()
    })
    // A mensagem do usuário vai no campo `message`; o histórico anterior vai em `history`.
    expect(api.post).toHaveBeenCalledWith('/chat', {
      message: 'Preciso de um paquímetro',
      history: [
        { role: 'model', text: expect.stringContaining('assistente do Empresta Lab') },
      ],
    })
  })

  it('exibe mensagem de erro amigável quando a API falha', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('network down'))

    renderChat()

    const input = screen.getByLabelText(/mensagem para o assistente/i)
    fireEvent.change(input, { target: { value: '2 multímetros' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/ocorreu um erro ao se comunicar com o assistente/i),
      ).toBeInTheDocument()
    })
  })
})

describe('Chat — navegação para acompanhar empréstimos', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
    localStorage.clear()
  })

  it('exibe botão para acompanhar empréstimos ativos apontando para /emprestimos', () => {
    renderChat()

    const botao = screen.getByRole('link', { name: /acompanhar empréstimos/i })
    expect(botao).toHaveAttribute('href', '/emprestimos')
  })
})
