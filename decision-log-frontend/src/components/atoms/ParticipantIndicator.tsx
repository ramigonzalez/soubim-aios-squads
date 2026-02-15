import { Users } from 'lucide-react'

interface ParticipantIndicatorProps {
  participants: Array<{ name: string; role: string }>
}

export function ParticipantIndicator({ participants }: ParticipantIndicatorProps) {
  if (!participants || participants.length === 0) return null

  return (
    <div className="relative group inline-flex items-center">
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
        aria-label={`${participants.length} participants`}
      >
        <Users className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{participants.length}</span>
      </button>

      {/* Tooltip */}
      <div
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus-within:block z-50"
      >
        <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg py-2 px-3 max-h-48 overflow-y-auto min-w-[180px]">
          <p className="font-semibold mb-1.5 text-gray-300">Participants</p>
          <ul className="space-y-1">
            {participants.map((p, i) => (
              <li key={i} className="flex items-baseline gap-1">
                <span className="text-white">{p.name}</span>
                <span className="text-gray-400">&mdash;</span>
                <span className="text-gray-400">{p.role}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
      </div>
    </div>
  )
}
