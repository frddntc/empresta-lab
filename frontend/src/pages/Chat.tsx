import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Send } from 'lucide-react'
import api from '../api/client'
import { ChatMessageBubble } from '../components/ChatMessageBubble'
import { TypingIndicator } from '../components/TypingIndicator'

export interface Message {
  role: 'user' | 'model'
  text: string
}

const WELCOME_MESSAGE: Message = {
  role: 'model',
  text: 'Olá! Sou o assistente do Empresta Lab. Qual equipamento e quantidade você gostaria de solicitar?',
}

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || loading) return

      const userMessage = input.trim()
      const newHistory = [...messages, { role: 'user' as const, text: userMessage }]
      setMessages(newHistory)
      setInput('')
      setLoading(true)

      try {
        // A API espera o histórico SEM a mensagem atual (que vai em `message`).
        const response = await api.post('/chat', {
          message: userMessage,
          history: messages,
        })
        setMessages([...newHistory, { role: 'model', text: response.data.reply }])
      } catch (err) {
        setMessages([
          ...newHistory,
          { role: 'model', text: 'Desculpe, ocorreu um erro ao se comunicar com o assistente.' },
        ])
      } finally {
        setLoading(false)
      }
    },
    [input, loading, messages],
  )

  return (
    <section className="chat-page">
      <div className="chat-header">
        <div>
          <h2>Assistente Empresta Lab</h2>
          <p className="chat-subtitle">Consulte disponibilidade e solicite empréstimos de equipamentos.</p>
        </div>
        <Link to="/emprestimos" className="btn-ghost chat-acompanhar">
          <ClipboardList size={18} />
          Acompanhar empréstimos
        </Link>
      </div>

      <div className="chat-messages" aria-live="polite">
        {messages.map((message, index) => (
          <ChatMessageBubble key={index} message={message} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex.: 2 multímetros digitais"
          aria-label="Mensagem para o assistente"
          disabled={loading}
        />
        <button
          type="submit"
          className="btn-primary chat-send-button"
          disabled={loading || !input.trim()}
          aria-label="Enviar mensagem"
        >
          <Send size={18} />
          <span className="btn-label">Enviar</span>
        </button>
      </form>
    </section>
  )
}
