/**
 * StagePill — Badge showing current stage name with active indicator.
 * Story 6.3: Frontend — Project List Enhancement
 */
interface StagePillProps {
  stageName: string
  isCurrent?: boolean
}

export function StagePill({ stageName, isCurrent = false }: StagePillProps) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
      {isCurrent && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}
      {stageName}
    </span>
  )
}
