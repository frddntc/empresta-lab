import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import App from '../App'

const renderApp = () =>
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )

describe('Confirmação de logout (header global)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'token-fake')
    localStorage.setItem('role', 'cliente')
  })

  it('abre o popup "Realmente deseja sair?" ao clicar em Sair', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: /sair da conta/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Realmente deseja sair?')).toBeInTheDocument()
  })

  it("botão 'Não' apenas fecha o popup e mantém a sessão", () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: /sair da conta/i }))
    fireEvent.click(screen.getByRole('button', { name: /^não$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('token-fake')
  })

  it("botão 'Sim' limpa a sessão e redireciona para a home", () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign },
      writable: true,
    })

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: /sair da conta/i }))
    fireEvent.click(screen.getByRole('button', { name: /^sim$/i }))

    expect(assign).toHaveBeenCalledWith('/')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('role')).toBeNull()
  })
})
