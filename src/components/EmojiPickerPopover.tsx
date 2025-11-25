import type { EmojiClickData } from 'emoji-picker-react'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { Smile } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { InputGroupButton } from './ui/input-group'
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

  const { theme } = useTheme();


  return (
    <Popover>
      <PopoverTrigger asChild>
        <InputGroupButton
          type="button"
          variant="ghost"
          className="rounded-full"
          size="icon-xs"
          disabled={disabled}
        >
          <Smile />
        </InputGroupButton>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" align="end">
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme={theme === 'light' ? Theme.LIGHT : Theme.DARK}
          searchPlaceHolder="Search emoji..."
          width={350}
          height={400}
        />
      </PopoverContent>
    </Popover>
  )
}
