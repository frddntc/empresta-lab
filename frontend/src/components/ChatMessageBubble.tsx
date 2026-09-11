import React from 'react'
import { Bot, User } from 'lucide-react'
import type { Message } from '../pages/Chat'

interface ChatMessageBubbleProps {
  message: Message
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`chat-row ${isUser ? 'chat-row-user' : 'chat-row-model'}`}>
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-model'}`}>
        <span className="chat-avatar" aria-hidden="true">
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </span>
        <p className="chat-text">{message.text}</p>
      </div>
    </div>
  )
}
