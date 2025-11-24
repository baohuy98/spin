import { EmojiPicker } from 'frimousse'
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
        <EmojiPicker.Root
          className="isolate flex h-[368px] w-fit flex-col bg-popover text-popover-foreground"
          onEmojiSelect={(emoji) => onEmojiSelect(emoji.emoji)}
        >
          <EmojiPicker.Search
            className="mx-2 mt-2 flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search emoji..."
          />
          <EmojiPicker.Viewport className="flex-1 overflow-y-auto p-2">
            <EmojiPicker.Loading className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading…
            </EmojiPicker.Loading>
            <EmojiPicker.Empty className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No emoji found.
            </EmojiPicker.Empty>
            <EmojiPicker.List
              className="select-none"
              components={{
                CategoryHeader: ({ category }) => (
                  <div className="px-1 pb-1.5 pt-2 text-xs font-medium text-muted-foreground">
                    {category.label}
                  </div>
                ),
                Emoji: ({ emoji, ...props }) => (
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-accent"
                    {...props}
                  >
                    {emoji.emoji}
                  </button>
                ),
              }}
            />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </PopoverContent>
    </Popover>
  )
}
