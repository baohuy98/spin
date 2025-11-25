import { useMemo, useState } from 'react'
import type { LivestreamReaction } from '../hooks/useSocket'
import FloatingReaction from './FloatingReaction'

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '🔥', '👏', '🎉', '💯']

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
            <div className="absolute bottom-6 right-6 flex flex-row gap-2 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
                {REACTION_EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => onSendReaction(emoji)}
                        className="w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
                        title={`Send ${emoji} reaction`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    )
}
