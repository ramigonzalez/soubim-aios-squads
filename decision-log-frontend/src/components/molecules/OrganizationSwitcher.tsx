import { useTranslation } from 'react-i18next'
import { Building2 } from 'lucide-react'
import { useActiveOrganization } from '../../hooks/useOrganizations'

/**
 * Active organization (Story 12.5): a select for users in more than one organization,
 * just the name for users in one. Switching refetches everything (scoped to the new organization).
 */
export function OrganizationSwitcher() {
  const { t } = useTranslation('nav')
  const { organizations, active, setActive } = useActiveOrganization()

  if (!active) return null

  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <Building2 className="w-4 h-4 text-gray-500" aria-hidden="true" />
      {organizations.length > 1 ? (
        <select
          aria-label={t('organization')}
          value={active.id}
          onChange={e => setActive(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {organizations.map(org => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="font-medium">{active.name}</span>
      )}
    </div>
  )
}
