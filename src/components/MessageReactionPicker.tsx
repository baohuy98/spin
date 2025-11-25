import type { EmojiClickData } from 'emoji-picker-react'
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react'
import { SmilePlus } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from './ThemeProvider'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

interface MessageReactionPickerProps {
  onReactionSelect: (emoji: string) => void
  disabled?: boolean
}

export default function MessageReactionPicker({
  onReactionSelect,
  disabled
}: MessageReactionPickerProps) {
  const [open, setOpen] = useState(false)

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onReactionSelect(emojiData.emoji)
    setOpen(false)
  }
  const { theme } = useTheme();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-100 md:opacity-0 group-hover:opacity-100  transition-opacity"
          disabled={disabled}
        >
          <SmilePlus className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0 rounded-full" align="center" side="top">
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme={theme === 'light' ? Theme.LIGHT : Theme.DARK}
          emojiStyle={EmojiStyle.NATIVE}
          reactionsDefaultOpen={true}
          allowExpandReactions={true}
          searchPlaceHolder="Search emoji..."
          width={350}
          height={400}
        />
      </PopoverContent>
    </Popover>
  )
}
