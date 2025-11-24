import EmojiPicker, { Theme } from 'emoji-picker-react'
import type { EmojiClickData } from 'emoji-picker-react'
import { Smile } from 'lucide-react'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

interface EmojiPickerPopoverProps {
  onEmojiSelect: (emoji: string) => void
  disabled?: boolean
}

export default function EmojiPickerPopover({
  onEmojiSelect,
  disabled
}: EmojiPickerPopoverProps) {
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          disabled={disabled}
        >
          <Smile className="w-4 h-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" align="end">
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme={Theme.AUTO}
          searchPlaceHolder="Search emoji..."
          width={350}
          height={400}
        />
      </PopoverContent>
    </Popover>
  )
}
