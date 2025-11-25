import { useState } from 'react'
import FloatingReaction from './FloatingReaction'

interface Reaction {
    id: string
    emoji: string
}

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '🔥', '👏', '🎉', '💯']

export default function LivestreamReactions() {
    const [reactions, setReactions] = useState<Reaction[]>([])

    const addReaction = (emoji: string) => {
        const id = `${Date.now()}-${Math.random()}`
        setReactions(prev => [...prev, { id, emoji }])
    }

    const removeReaction = (id: string) => {
        setReactions(prev => prev.filter(r => r.id !== id))
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Floating Reactions Container */}
            <div className="absolute inset-0 overflow-hidden">
                {reactions.map(reaction => (
                    <FloatingReaction
                        key={reaction.id}
                        id={reaction.id}
                        emoji={reaction.emoji}
                        onComplete={removeReaction}
                    />
                ))}
            </div>

            {/* Reaction Buttons - Bottom Right */}
            <div className="absolute bottom-6 right-6 flex flex-row gap-2 pointer-events-auto opacity-0 group-hover:opacity-100">
                {REACTION_EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => addReaction(emoji)}
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
