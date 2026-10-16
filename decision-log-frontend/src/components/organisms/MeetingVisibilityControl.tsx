/**
 * Meeting visibility in the meeting viewer (Story 12.4), on the Promem design system: badge, and for
 * admins of the meeting's organization a button to share it with (or hide it from) the other
 * organizations on the project, confirmed in a Dialog.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Dialog, Icons } from '../../design-system'
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
  const shared = visibility === 'shared'

  const confirm = () => {
    mutation.mutate(target, { onSuccess: () => setConfirming(false) })
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge
        icon={shared ? <Icons.team /> : undefined}
        title={t(shared ? 'common:visibility.sharedHint' : 'common:visibility.internalHint')}
        data-testid="visibility-badge"
      >
        {t(shared ? 'common:visibility.shared' : 'common:visibility.internal')}
      </Badge>
      {canChange && (
        <Button size="sm" variant="link" onClick={() => setConfirming(true)}>
          {t(target === 'shared' ? 'visibility.makeShared' : 'visibility.makeInternal')}
        </Button>
      )}
      <Dialog
        open={canChange && confirming}
        onOpenChange={(open) => !mutation.isLoading && setConfirming(open)}
        title={t('visibility.confirmTitle')}
        description={t(target === 'shared' ? 'visibility.confirmShared' : 'visibility.confirmInternal')}
        footer={
          <>
            {mutation.isError && (
              <p role="alert" className="mr-auto text-caption text-danger-ink">
                {t('visibility.error')}
              </p>
            )}
            <Button onClick={() => setConfirming(false)} disabled={mutation.isLoading}>
              {t('common:cancel')}
            </Button>
            <Button variant="primary" onClick={confirm} loading={mutation.isLoading}>
              {t('visibility.confirm')}
            </Button>
          </>
        }
      />
    </span>
  )
}
