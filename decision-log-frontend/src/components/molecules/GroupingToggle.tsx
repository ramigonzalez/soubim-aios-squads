import { useTranslation } from 'react-i18next'

interface GroupingToggleProps {
  value: 'date' | 'discipline'
  onChange: (value: 'date' | 'discipline') => void
}

export function GroupingToggle({ value, onChange }: GroupingToggleProps) {
  const { t } = useTranslation('history')
  return (
    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600" role="radiogroup" aria-label={t('filters.groupBy.ariaLabel')}>
      <span className="font-medium">{t('groupingToggle.label')}</span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="radio"
          name="groupBy"
          value="date"
          checked={value === 'date'}
          onChange={() => onChange('date')}
          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
        />
        <span>{t('groupingToggle.byDate')}</span>
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
        <span>{t('groupingToggle.byDiscipline')}</span>
      </label>
    </div>
  )
}
