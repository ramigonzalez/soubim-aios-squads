/** A pending source's flag (external participants, possible duplicate, low confidence) as a banner. */
import { useTranslation } from 'react-i18next'
import { Banner } from '../../design-system'
import { formatDayTime } from '../../lib/format'
import type { SourceFlag } from '../../types/ingestion'

export function SourceFlagBanner({ flag }: { flag: SourceFlag }) {
  const { t } = useTranslation('inbox')
  const text =
    flag.code === 'external'
      ? t('flags.external', { count: flag.count ?? 0, names: (flag.names ?? []).join(', ') })
      : flag.code === 'duplicate'
        ? t('flags.duplicate', { title: flag.title, date: formatDayTime(flag.date) })
        : t('flags.lowConfidence')
  return <Banner tone={flag.kind === 'warn' ? 'warning' : 'info'}>{text}</Banner>
}
