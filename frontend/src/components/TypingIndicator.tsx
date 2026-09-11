import React from 'react'
import { Bot } from 'lucide-react'

export const TypingIndicator: React.FC = () => {
  return (
    <div className="chat-row chat-row-model" aria-live="polite" aria-label="Assistente está digitando...">
      <div className="chat-bubble chat-bubble-model chat-bubble-typing">
        <span className="chat-avatar" aria-hidden="true">
          <Bot size={16} />
        </span>
        <span className="typing-dots">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
        <span className="typing-label">Assistente está digitando...</span>
      </div>
    </div>
  )
}
