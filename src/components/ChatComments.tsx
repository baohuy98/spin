import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
}

interface ChatCommentsProps {
  roomId: string | null
  currentUserId: string
  currentUserName: string
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isConnected: boolean
}

export default function ChatComments({
  roomId,
  currentUserId,
  currentUserName,
  messages,
  onSendMessage,
  isConnected
}: ChatCommentsProps) {
  const [inputMessage, setInputMessage] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputMessage.trim() || !isConnected || !roomId) {
      return
    }

    onSendMessage(inputMessage.trim())
    setInputMessage('')
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const isOwnMessage = (userId: string) => userId === currentUserId

  return (
    <div className="bg-card border rounded-lg flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold flex-1">Chat & Comments</h3>
        {!isConnected && (
          <span className="text-xs text-muted-foreground">Offline</span>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isOwnMessage(msg.userId) ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${isOwnMessage(msg.userId)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent'
                      }`}
                  >
                    {!isOwnMessage(msg.userId) && (
                      <p className="text-xs font-semibold mb-1 opacity-80">
                        {msg.userName}
                      </p>
                    )}
                    <p className="text-sm break-words">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${isOwnMessage(msg.userId)
                          ? 'text-primary-foreground/60'
                          : 'text-muted-foreground'
                        }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="px-4 py-3 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder={
              isConnected
                ? 'Type your message...'
                : 'Connect to room to chat...'
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={!isConnected || !roomId}
            className="flex-1"
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputMessage.trim() || !isConnected || !roomId}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        {inputMessage.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {inputMessage.length}/500
          </p>
        )}
      </div>
    </div>
  )
}
