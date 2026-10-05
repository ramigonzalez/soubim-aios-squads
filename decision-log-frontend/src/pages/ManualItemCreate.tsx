/**
 * ManualItemCreate page — create a new project item manually.
 * Story 7.3: Manual Input — Create Project Item Form
 */
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ManualItemForm from '../components/organisms/ManualItemForm'

export default function ManualItemCreate() {
  const { t } = useTranslation('item')
  const { id: projectId } = useParams<{ id: string }>()

  if (!projectId) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('create.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('create.subtitle')}
          </p>
        </div>
        <ManualItemForm projectId={projectId} />
      </div>
    </div>
  )
}
