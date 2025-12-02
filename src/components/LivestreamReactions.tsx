import { useMemo, useState } from 'react';
import type { LivestreamReaction } from '../hooks/useSocket';
import FloatingReaction from './FloatingReaction';

const REACTION_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '👏', '🎉', '💯']

interface LivestreamReactionsProps {
    onSendReaction: (emoji: string) => void
    incomingReactions: LivestreamReaction[]
}

export default function LivestreamReactions({ onSendReaction, incomingReactions }: LivestreamReactionsProps) {
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

    // Filter out completed reactions
    const activeReactions = useMemo(() => {
        return incomingReactions.filter(reaction => !completedIds.has(reaction.id))
    }, [incomingReactions, completedIds])

    const handleReactionComplete = (id: string) => {
        setCompletedIds(prev => new Set(prev).add(id))
    }

    // Check if mobile based on screen width (768px = Tailwind md breakpoint)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const emojis = isMobile ? REACTION_EMOJIS.slice(0, 3) : REACTION_EMOJIS;

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Floating Reactions Container */}
            <div className="absolute inset-0 overflow-hidden">
                {activeReactions.map(reaction => (
                    <FloatingReaction
                        key={reaction.id}
                        id={reaction.id}
                        emoji={reaction.emoji}
                        userName={reaction.userName}
                        onComplete={handleReactionComplete}
                    />
                ))}
            </div>

            {/* Reaction Buttons - Bottom Right */}
            <div className="absolute bottom-4 left-4 flex flex-row gap-2 pointer-events-auto md:opacity-0 group-hover:opacity-100 transition-opacity">
                {emojis.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => onSendReaction(emoji)}
                        className="md:w-12 md:h-12 w-8 h-8 md:text-2xl text-lg bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center  transition-all hover:scale-110 active:scale-95"
                        title={`Send ${emoji} reaction`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    )
}
