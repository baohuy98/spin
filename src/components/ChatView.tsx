import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpIcon, MessageCircle, Radio } from 'lucide-react'
import { useState } from 'react'
import christmasBackground from '../assets/christmas-santa-claus-png.png'
import EmojiPickerPopover from './EmojiPickerPopover'
import MessageReactionPicker from './MessageReactionPicker'
import { useViewTheme } from './ViewThemeProvider'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from './ui/input-group'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'

export interface MessageReaction {
  emoji: string
  userIds: string[]
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
  reactions?: MessageReaction[]
}

interface ChatViewProps {
  roomId: string | null
  currentUserId: string
  currentUserName: string
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  onReactToMessage?: (messageId: string, emoji: string) => void
  isConnected: boolean
}

export default function ChatView({
  roomId,
  currentUserId,
  messages,
  onSendMessage,
  onReactToMessage,
  isConnected
}: ChatViewProps) {
  const [inputMessage, setInputMessage] = useState('')
  const { viewTheme } = useViewTheme()

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputMessage.trim() || !roomId) {
      return
    }

    onSendMessage(inputMessage.trim())
    setInputMessage('')
  }

  const isOwnMessage = (userId: string) => userId === currentUserId

  return (
    <div
      className="bg-card border rounded-lg flex flex-col relative overflow-hidden"
      style={viewTheme === 'christmas' ? {
        backgroundImage: `url(${christmasBackground})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {}}
    >
      {/* Semi-transparent overlay for better text readability when Christmas theme is active */}
      {viewTheme === 'christmas' && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-0" />
      )}

      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-primary animate-pulse" />
          <h3 className="text-lg font-semibold flex-1">Live Chat</h3>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className={cn("w-2 h-2 rounded-full bg-green-500 animate-pulse", {
              'bg-destructive': !isConnected
            })} />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="h-[300px] lg:h-[420px] px-4 py-3 relative z-10">
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
                  <div className={`group flex items-end gap-1 ${isOwnMessage(msg.userId) ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className={`rounded-lg px-3 py-2 ${isOwnMessage(msg.userId)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent'
                        }`}
                    >
                      {!isOwnMessage(msg.userId) && (
                        <p className="text-xs font-semibold mb-1 opacity-80">
                          {msg.userName}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-line wrap-anywhere">{msg.message}</p>
                      {/* Reactions display */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 -mb-1">
                          {msg.reactions.map((reaction) => (
                            <button
                              key={reaction.emoji}
                              type="button"
                              onClick={() => onReactToMessage?.(msg.id, reaction.emoji)}
                              className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${reaction.userIds.includes(currentUserId)
                                ? 'bg-primary/20 border-primary/40'
                                : 'bg-background/50 border-border hover:bg-background/80'
                                }`}
                            >
                              <span>{reaction.emoji}</span>
                              <span className="text-[10px] opacity-70">{reaction.userIds.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Reaction picker button */}
                    <MessageReactionPicker
                      onReactionSelect={(emoji) => onReactToMessage?.(msg.id, emoji)}
                      disabled={!isConnected}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="relative z-10">
        <Separator />
        <form onSubmit={handleSendMessage}>
          <InputGroup className='border-none' >
            <InputGroupTextarea
              placeholder={
                isConnected
                  ? 'Type your message...'
                  : 'Connect to room to chat...'
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={!isConnected || !roomId}
              maxLength={500}
              rows={1}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && !e.shiftKey && e.keyCode !== 229) {
                  e.preventDefault()
                  handleSendMessage(e as React.FormEvent)
                }
              }}
            />
            <InputGroupAddon align="block-end" className="flex justify-between">
              <EmojiPickerPopover
                onEmojiSelect={(emoji) => setInputMessage((prev) => prev + emoji)}
                disabled={!isConnected || !roomId}
              />
              <InputGroupButton
                variant="default"
                className="rounded-full"
                size="icon-xs"
                type="submit"

                disabled={!inputMessage.trim() || !isConnected || !roomId}
              >
                <ArrowUpIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </div>
    </div>
  )
}
