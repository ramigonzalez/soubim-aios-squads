interface BulkActionBarProps {
  selectedCount: number
  onApprove: () => void
  onReject: () => void
  isLoading: boolean
}

export default function BulkActionBar({
  selectedCount,
  onApprove,
  onReject,
  isLoading,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-between z-30"
      aria-live="polite"
      role="status"
    >
      <span className="text-sm font-medium text-gray-700">
        {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={onReject}
          disabled={isLoading}
          className="border border-red-300 text-red-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          Reject Selected
        </button>
        <button
          onClick={onApprove}
          disabled={isLoading}
          className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          Approve Selected
        </button>
      </div>
    </div>
  )
}
