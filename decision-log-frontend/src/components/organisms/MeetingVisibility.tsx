/**
 * Story 12.4 meeting visibility, restyled: a badge, and for admins of the
 * meeting's organization a confirmed switch between internal and shared.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Dialog, Icons } from '../../design-system'
import { useSetMeetingVisibility } from '../../hooks/useMeeting'
import type { MeetingVisibility as Visibility } from '../../types/projectItem'

export function MeetingVisibility({ sourceId, visibility, canChange }: { sourceId: string; visibility: Visibility; canChange: boolean }) {
  const { t } = useTranslation('project')
  const [open, setOpen] = useState(false)
  const set = useSetMeetingVisibility(sourceId)
  const next: Visibility = visibility === 'shared' ? 'internal' : 'shared'
  return (
    <>
      <Badge tone="neutral" icon={visibility === 'shared' ? <Icons.link /> : undefined}>
        {t(`viewer.visibility.${visibility}`)}
      </Badge>
      {canChange && (
        <Button size="sm" variant="link" onClick={() => setOpen(true)}>
          {next === 'shared' ? t('viewer.visibility.makeShared') : t('viewer.visibility.makeInternal')}
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={next === 'shared' ? t('viewer.visibility.titleShared') : t('viewer.visibility.titleInternal')}
        description={next === 'shared' ? t('viewer.visibility.confirmShared') : t('viewer.visibility.confirmInternal')}
        footer={
          <>
            {set.isError && <p className="mr-auto text-caption text-danger-ink">{t('viewer.visibility.error')}</p>}
            <Button onClick={() => setOpen(false)}>{t('viewer.visibility.cancel')}</Button>
            <Button variant="primary" loading={set.isLoading} onClick={() => set.mutate(next, { onSuccess: () => setOpen(false) })}>
              {t('viewer.visibility.confirm')}
            </Button>
          </>
        }
      />
    </>
  )
}
