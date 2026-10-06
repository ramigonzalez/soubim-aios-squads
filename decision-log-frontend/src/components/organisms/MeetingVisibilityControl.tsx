/**
 * Meeting visibility in the meeting viewer (Story 12.4): badge, and for admins of the meeting's
 * organization a button to share it with (or hide it from) the other organizations on the project,
 * with a confirmation step.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { VisibilityBadge } from '../atoms/VisibilityBadge'
import { useSetMeetingVisibility } from '../../hooks/useMeeting'
import type { MeetingVisibility } from '../../types/projectItem'

interface MeetingVisibilityControlProps {
  sourceId: string
  visibility: MeetingVisibility
  canChange: boolean
}

export function MeetingVisibilityControl({ sourceId, visibility, canChange }: MeetingVisibilityControlProps) {
  const { t } = useTranslation('meeting')
  const [confirming, setConfirming] = useState(false)
  const mutation = useSetMeetingVisibility(sourceId)
  const target: MeetingVisibility = visibility === 'shared' ? 'internal' : 'shared'

  const confirm = () => {
    mutation.mutate(target, { onSuccess: () => setConfirming(false) })
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <VisibilityBadge visibility={visibility} />
      {canChange && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          {t(target === 'shared' ? 'visibility.makeShared' : 'visibility.makeInternal')}
        </button>
      )}
      {canChange && confirming && (
        <div
          role="alertdialog"
          aria-label={t('visibility.confirmTitle')}
          className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800"
        >
          <span>{t(target === 'shared' ? 'visibility.confirmShared' : 'visibility.confirmInternal')}</span>
          <button
            type="button"
            onClick={confirm}
            disabled={mutation.isLoading}
            className="rounded bg-amber-600 px-2 py-0.5 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {t('visibility.confirm')}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={mutation.isLoading}
            className="font-medium text-amber-800 hover:underline"
          >
            {t('common:cancel')}
          </button>
        </div>
      )}
      {mutation.isError && (
        <span role="alert" className="text-xs text-red-600">{t('visibility.error')}</span>
      )}
    </div>
  )
}
