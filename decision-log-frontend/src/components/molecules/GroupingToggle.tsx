interface GroupingToggleProps {
  value: 'date' | 'discipline'
  onChange: (value: 'date' | 'discipline') => void
}

export function GroupingToggle({ value, onChange }: GroupingToggleProps) {
  return (
    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600" role="radiogroup" aria-label="Group decisions by">
      <span className="font-medium">Group by:</span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="radio"
          name="groupBy"
          value="date"
          checked={value === 'date'}
          onChange={() => onChange('date')}
          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
        />
        <span>By Date</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="radio"
          name="groupBy"
          value="discipline"
          checked={value === 'discipline'}
          onChange={() => onChange('discipline')}
          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
        />
        <span>By Discipline</span>
      </label>
    </div>
  )
}
