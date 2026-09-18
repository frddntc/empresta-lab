import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Home from '../pages/Home'

const renderHome = () =>
  render(
    <BrowserRouter>
      <Home />
    </BrowserRouter>,
  )

describe('Página Home', () => {
  it('exibe o nome Empresta Lab em destaque e a frase de impacto', () => {
    renderHome()

    expect(screen.getByRole('heading', { name: 'Empresta Lab', level: 2 })).toBeInTheDocument()
    expect(
      screen.getByText(/caminho mais rápido entre você e o equipamento certo/i),
    ).toBeInTheDocument()
  })

  it('exibe os três boxes de informação', () => {
    renderHome()

    expect(screen.getByText('Sobre nós')).toBeInTheDocument()
    expect(screen.getByText('Devolução simples')).toBeInTheDocument()
    expect(screen.getByText('O que você encontra')).toBeInTheDocument()
  })

  it('exibe os três CTAs com as mensagens e destinos corretos', () => {
    renderHome()

    const login = screen.getByRole('link', { name: /fazer login/i })
    expect(login).toHaveAttribute('href', '/login')
    expect(screen.getByText(/fale já com o nosso assistente virtual/i)).toBeInTheDocument()

    const cadastro = screen.getByRole('link', { name: /criar conta/i })
    expect(cadastro).toHaveAttribute('href', '/register')
    expect(
      screen.getByText(/cadastre-se já e faça seu primeiro empréstimo/i),
    ).toBeInTheDocument()

    const admin = screen.getByRole('link', { name: /painel administrativo/i })
    expect(admin).toHaveAttribute('href', '/admin/login')
    expect(
      screen.getByText(/atualize seu estoque e fique por dentro de seus empréstimos vigentes/i),
    ).toBeInTheDocument()
  })

  it('exibe a faixa de suporte com os campos de email e telefone', () => {
    renderHome()

    expect(screen.getByText(/precisa de ajuda\? fale com o suporte/i)).toBeInTheDocument()
    expect(screen.getByText(/email: —/i)).toBeInTheDocument()
    expect(screen.getByText(/telefone: —/i)).toBeInTheDocument()
  })
})
