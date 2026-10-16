/**
 * Item detail in the 480 px SidePanel (README §5.5, COMPONENTS.md → ItemDetailPanel).
 * Replaces the old modal. Opens from any project list via `?item=`, keeps the
 * list visible, ↑/↓ walk the list's visible order, Esc closes, M toggles marco,
 * X toggles done. Empty sections are not rendered.
 */
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  ConsensusList,
  DisciplineList,
  DisciplineMarker,
  DueBadge,
  ErrorState,
  Field,
  IconButton,
  Icons,
  ImpactIndicator,
  Input,
  ItemTypeBadge,
  ItemTypeIcon,
  KeyValueList,
  MilestoneStar,
  SidePanel,
  SkeletonRows,
  SourceIcon,
  Tab,
  Tabs,
  TabsContent,
  TabsList,
  Textarea,
} from '../../design-system'
import { useEditReviewedItem, useRestoreOriginal, useReviewItem } from '../../hooks/useItemReview'
import { useSimilarItems } from '../../hooks/useSimilarItems'
import { formatDay, formatFullDate, formatClock, parseClock } from '../../lib/format'
import { consensusRows, impactLevel, impactRows, itemDate, itemStage, itemTitle, parseExcerpt } from '../../lib/items'
import type { StageInput } from '../../lib/stages'
import type { ProjectItem } from '../../types/projectItem'

export interface ItemDetailPanelProps {
  projectId: string
  open: boolean
  item: ProjectItem | undefined
  loading?: boolean
  error?: boolean
  stages: StageInput[]
  /** owning organization's owner/admin: milestones */
  canManage: boolean
  /** owning organization's reviewers: approve / reject / edit */
  canReview: boolean
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  onClose: () => void
  onOpenItem: (itemId: string) => void
  onToggleMilestone: (item: ProjectItem) => void
  onToggleDone: (item: ProjectItem) => void
}

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export function ItemDetailPanel(props: ItemDetailPanelProps) {
  const { t } = useTranslation('project')
  const { open, item, loading, error, onClose, onPrevious, onNext, hasPrevious, hasNext, canManage, onToggleMilestone, onToggleDone } = props
  const [tab, setTab] = useState('overview')

  // a new item opens on its overview tab
  useEffect(() => setTab('overview'), [item?.id])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (typing(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
    if (event.key === 'ArrowUp' && hasPrevious) {
      event.preventDefault()
      onPrevious()
    } else if (event.key === 'ArrowDown' && hasNext) {
      event.preventDefault()
      onNext()
    } else if ((event.key === 'm' || event.key === 'M') && item && canManage) {
      onToggleMilestone(item)
    } else if ((event.key === 'x' || event.key === 'X') && item?.item_type === 'action_item') {
      onToggleDone(item)
    }
  }

  const Up = Icons.previous
  const Down = Icons.next
  const Close = Icons.close
  const level = item ? impactLevel(item) : null

  return (
    <SidePanel open={open} onOpenChange={(value) => !value && onClose()} title={item ? itemTitle(item) : t('panel.title')}>
      <div className="flex h-full min-h-0 flex-col" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3.5">
          {item && <ItemTypeBadge type={item.item_type} />}
          {level === 'high' && <Badge tone="danger">{t('ui:impact.high')}</Badge>}
          <span className="ml-auto flex items-center gap-1">
            {item && (canManage || item.is_milestone) && (
              <MilestoneStar pressed={item.is_milestone} onToggle={canManage ? () => onToggleMilestone(item) : undefined} size="panel" />
            )}
            <IconButton label={t('panel.previous')} icon={<Up />} size="sm" variant="ghost" disabled={!hasPrevious} onClick={onPrevious} />
            <IconButton label={t('panel.next')} icon={<Down />} size="sm" variant="ghost" disabled={!hasNext} onClick={onNext} />
            <IconButton label={t('panel.close')} icon={<Close />} size="sm" variant="ghost" onClick={onClose} />
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && <SkeletonRows rows={6} className="p-5" />}
          {error && !loading && <ErrorState title={t('panel.loadError')} text={t('panel.notFound')} />}
          {item && !loading && (
            <ItemBody {...props} item={item} tab={tab} onTabChange={setTab} />
          )}
        </div>
      </div>
    </SidePanel>
  )
}

function ItemBody({
  projectId,
  item,
  stages,
  canReview,
  tab,
  onTabChange,
  onOpenItem,
  onToggleDone,
}: ItemDetailPanelProps & { item: ProjectItem; tab: string; onTabChange: (tab: string) => void }) {
  const { t } = useTranslation(['project', 'common'])
  const similar = useSimilarItems(projectId, tab === 'similar' ? item.id : null)
  const seconds = parseClock(item.timestamp)
  const isMeeting = item.source?.type === 'meeting' && !!item.source.id
  const meetingHref = isMeeting ? `/projects/${projectId}/meetings/${item.source!.id}${seconds != null ? `?t=${seconds}` : ''}` : null
  const stage = itemStage(item, stages)
  const consensus = consensusRows(item)
  const impacts = impactRows(item)
  const level = impactLevel(item)
  const hasOverview = !!(item.why || item.causation || consensus.length || impacts.length || level)
  const Play = Icons.play

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          {item.item_type === 'action_item' && (
            <span className="mt-1.5">
              <ItemTypeIcon type="action_item" done={item.is_done} onToggleDone={() => onToggleDone(item)} />
            </span>
          )}
          <h2 className={item.is_done ? 'text-h2 text-ink-3 line-through' : 'text-h2 text-ink'}>{itemTitle(item)}</h2>
        </div>
        {item.title && item.statement && item.statement !== item.title && <p className="text-body text-ink-soft">{item.statement}</p>}
        {item.affected_disciplines.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {item.affected_disciplines.map((d) => (
              <DisciplineMarker key={d} discipline={d} size="md" label="name" />
            ))}
          </div>
        )}
        <KeyValueList
          items={[
            { label: t('panel.who'), value: item.who },
            { label: t('panel.owner'), value: item.item_type === 'action_item' ? item.owner : null },
            {
              label: t('panel.origin'),
              value: (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <SourceIcon type={item.source?.type ?? item.source_type} />
                  <span className="min-w-0">
                    {[item.source?.title, formatFullDate(itemDate(item))].filter(Boolean).join(' · ')}
                  </span>
                </span>
              ),
            },
            {
              label: t('panel.recording'),
              value:
                meetingHref && seconds != null ? (
                  <Link to={meetingHref} className="inline-flex items-center gap-1.5 font-medium text-accent hover:text-accent-strong">
                    <Play className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    <span className="font-mono text-mono">{formatClock(seconds)}</span>
                    {t('panel.listen')}
                  </Link>
                ) : null,
            },
            { label: t('panel.due'), value: item.item_type === 'action_item' && item.due_date ? <DueBadge due={item.due_date} done={item.is_done} /> : null },
            { label: t('panel.stage'), value: stage?.name ?? null },
            {
              label: t('panel.addedBy'),
              value: item.created_by_name ? (
                <span className="inline-flex items-center gap-2">
                  {item.created_by_name}
                  {item.created_by_external && <Badge>{t('common:external.badge')}</Badge>}
                </span>
              ) : null,
            },
          ]}
        />
      </div>

      <ReviewBlock projectId={projectId} item={item} canReview={canReview} />

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <Tab value="overview">{t('panel.tabs.overview')}</Tab>
          <Tab value="excerpt">{t('panel.tabs.excerpt')}</Tab>
          <Tab value="similar" count={similar.data?.length}>
            {t('panel.tabs.similar')}
          </Tab>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-5 pt-4">
          {item.why && (
            <Section label={t('panel.why')}>
              <p className="font-serif text-reading text-ink [text-wrap:pretty]">{item.why}</p>
            </Section>
          )}
          {item.causation && (
            <Section label={t('panel.causation')}>
              <p className="text-body text-ink-soft [text-wrap:pretty]">{item.causation}</p>
            </Section>
          )}
          {consensus.length > 0 && <ConsensusList rows={consensus} />}
          {(impacts.length > 0 || level) && (
            <Section label={t('panel.impacts')}>
              {level && <ImpactIndicator level={level} />}
              {impacts.length > 0 && (
                <KeyValueList boxed items={impacts.map((row) => ({ label: t(`panel.impactKinds.${row.kind}`), value: row.text }))} />
              )}
            </Section>
          )}
          {!hasOverview && <p className="text-small text-ink-2">{t('panel.sparse')}</p>}
        </TabsContent>

        <TabsContent value="excerpt" className="flex flex-col gap-3 pt-4">
          <Excerpt item={item} meetingHref={meetingHref} />
        </TabsContent>

        <TabsContent value="similar" className="flex flex-col gap-3 pt-4">
          <p className="text-small text-ink-2">{t('panel.similarIntro')}</p>
          {similar.isLoading && <SkeletonRows rows={3} rowClassName="h-row-2" />}
          {similar.isError && <ErrorState title={t('panel.similarError')} onRetry={() => void similar.refetch()} className="py-4" />}
          {similar.data?.length === 0 && <p className="text-small text-ink-3">{t('panel.similarEmpty')}</p>}
          {similar.data && similar.data.length > 0 && (
            <ul className="overflow-hidden rounded-lg border border-line">
              {similar.data.map((other) => (
                <li key={other.id}>
                  <button
                    type="button"
                    onClick={() => onOpenItem(other.id)}
                    className="grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line-soft px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-2"
                  >
                    <ItemTypeIcon type={other.item_type} done={other.is_done} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-body font-medium text-ink">{itemTitle(other)}</span>
                      <span className="truncate text-caption text-ink-2">
                        {[t(`labels:itemType.${other.item_type}`), t(`panel.reasons.${other.reason}`), formatDay(itemDate(other))].join(' · ')}
                      </span>
                    </span>
                    <DisciplineList disciplines={other.affected_disciplines} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-label uppercase text-ink-2">{label}</h3>
      {children}
    </section>
  )
}

function Excerpt({ item, meetingHref }: { item: ProjectItem; meetingHref: string | null }) {
  const { t } = useTranslation(['project', 'labels'])
  const lines = parseExcerpt(item.source_excerpt)
  const Video = Icons.meetings
  const kind = item.source?.type ?? item.source_type
  return (
    <>
      <p className="flex items-center gap-1.5 text-small font-semibold text-ink">
        <SourceIcon type={kind} />
        {[t(`labels:sourceType.${kind}`), item.source?.title].filter(Boolean).join(' · ')}
      </p>
      {lines.length === 0 ? (
        <p className="text-small text-ink-3">{t('panel.excerptEmpty')}</p>
      ) : (
        <div className="flex flex-col rounded-md bg-surface-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[56px_minmax(0,1fr)] gap-2 px-3 py-2">
              <span className="font-mono text-mono-sm text-ink-3">{line.time ?? ''}</span>
              <p className="text-body text-ink">
                {line.speaker && <span className="font-semibold">{line.speaker}: </span>}
                {line.text}
              </p>
            </div>
          ))}
        </div>
      )}
      {meetingHref && (
        <Button asChild className="self-start">
          <Link to={meetingHref}>
            <Video className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {t('panel.openMeeting')}
          </Link>
        </Button>
      )}
    </>
  )
}

/** Story 12.6 review, in the panel: status, approve / reject / back to pending, edit, AI original. */
function ReviewBlock({ projectId, item, canReview }: { projectId: string; item: ProjectItem; canReview: boolean }) {
  const { t } = useTranslation('project')
  const review = useReviewItem(projectId)
  const edit = useEditReviewedItem(projectId)
  const restore = useRestoreOriginal(projectId)
  const [editing, setEditing] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [form, setForm] = useState({ title: '', statement: '', why: '', owner: '', due: '' })
  const status = item.review_status ?? 'approved'
  const original = item.original

  useEffect(() => {
    setEditing(false)
    setShowOriginal(false)
  }, [item.id])

  // approved, unedited items need no review block
  if (status === 'approved' && !item.is_edited && !editing) {
    if (!canReview) return null
    return (
      <div>
        <Button size="sm" variant="ghost" icon={<Icons.manual />} onClick={() => startEdit()}>
          {t('panel.review.edit')}
        </Button>
      </div>
    )
  }
  if (!canReview && !original && status === 'approved') return null

  function startEdit() {
    setForm({
      title: item.title ?? '',
      statement: item.statement,
      why: item.why ?? '',
      owner: item.owner ?? '',
      due: item.due_date ? item.due_date.slice(0, 10) : '',
    })
    setEditing(true)
  }

  const busy = review.isLoading || edit.isLoading || restore.isLoading
  const failed = review.isError || edit.isError || restore.isError
  const statusLabel = t(`panel.review.${status}`)

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-label uppercase text-ink-2">{t('panel.review.label')}</h3>
        <Badge tone={status === 'pending' ? 'warning' : status === 'rejected' ? 'muted' : 'success'}>{statusLabel}</Badge>
        {item.is_edited && <Badge tone="accent">{t('panel.review.edited')}</Badge>}
        {item.reviewed_by_name && status !== 'pending' && (
          <span className="text-caption text-ink-2">{t('panel.review.by', { status: statusLabel, name: item.reviewed_by_name })}</span>
        )}
      </div>

      {canReview && !editing && (
        <div className="flex flex-wrap gap-2">
          {status !== 'approved' && (
            <Button size="sm" variant="primary" icon={<Icons.check />} disabled={busy} onClick={() => review.mutate({ itemId: item.id, status: 'approved' })}>
              {t('panel.review.approve')}
            </Button>
          )}
          {status !== 'rejected' && (
            <Button size="sm" icon={<Icons.close />} disabled={busy} onClick={() => review.mutate({ itemId: item.id, status: 'rejected' })}>
              {t('panel.review.reject')}
            </Button>
          )}
          {status !== 'pending' && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => review.mutate({ itemId: item.id, status: 'pending' })}>
              {t('panel.review.backToPending')}
            </Button>
          )}
          <Button size="sm" variant="ghost" icon={<Icons.manual />} disabled={busy} onClick={startEdit}>
            {t('panel.review.edit')}
          </Button>
        </div>
      )}

      {canReview && editing && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            edit.mutate(
              {
                itemId: item.id,
                edits: { title: form.title || null, statement: form.statement, why: form.why, owner: form.owner || null, due_date: form.due || null },
              },
              { onSuccess: () => setEditing(false) },
            )
          }}
        >
          <Field label={t('panel.review.fields.title')}>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label={t('panel.review.fields.statement')} error={form.statement.trim() ? undefined : t('panel.review.statementRequired')}>
            <Textarea value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} />
          </Field>
          <Field label={t('panel.review.fields.why')}>
            <Textarea value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} />
          </Field>
          {item.item_type === 'action_item' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('panel.review.fields.owner')}>
                <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
              </Field>
              <Field label={t('panel.review.fields.due')}>
                <Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
              </Field>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="primary" loading={edit.isLoading} disabled={!form.statement.trim()}>
              {t('panel.review.save')}
            </Button>
            <Button size="sm" onClick={() => setEditing(false)}>
              {t('panel.review.cancel')}
            </Button>
          </div>
        </form>
      )}

      {original && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-3">
            <Button size="sm" variant="link" aria-expanded={showOriginal} onClick={() => setShowOriginal(!showOriginal)}>
              {showOriginal ? t('panel.review.hideOriginal') : t('panel.review.showOriginal')}
            </Button>
            {canReview && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => restore.mutate({ itemId: item.id })}>
                {t('panel.review.restore')}
              </Button>
            )}
          </div>
          {showOriginal && (
            <KeyValueList
              boxed
              variant="wide"
              items={[
                { label: t('panel.review.fields.title'), value: original.title },
                { label: t('panel.review.fields.statement'), value: original.statement },
                { label: t('panel.review.fields.why'), value: original.why },
                { label: t('panel.review.fields.owner'), value: original.owner },
                { label: t('panel.review.fields.due'), value: original.due_date ? formatFullDate(original.due_date) : null },
              ]}
            />
          )}
        </div>
      )}
      {failed && <p className="text-caption text-danger-ink">{t('panel.review.error')}</p>}
    </section>
  )
}
