/**
 * Manual item entry (REVAMP-MAPPING §6.1 #4): decisions also happen outside
 * recorded meetings. Form-shell page; saves as source "Entrada manual" and
 * opens the new item in the Histórico.
 */
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  Banner,
  Button,
  Checkbox,
  Chip,
  DISCIPLINE_ORDER,
  DisciplineMarker,
  Field,
  Input,
  ITEM_TYPE_ORDER,
  ItemTypeIcon,
  SegmentedControl,
  Select,
  Textarea,
  useToast,
} from '../design-system'
import { FormSection, FormShell } from '../components/templates/FormShell'
import { useCreateProjectItem } from '../hooks/useProjectItemMutation'
import { useParticipants } from '../hooks/useParticipants'
import { useProject } from '../hooks/useProject'
import type { ConsensusEntry, Discipline, ItemType, ProjectItemCreate } from '../types/projectItem'

type ConsensusChoice = '' | ConsensusEntry['status']
const CONSENSUS: ConsensusEntry['status'][] = ['AGREE', 'MIXED', 'DISAGREE', 'ABSTAIN']

export default function ManualItemNew() {
  const { t } = useTranslation(['project', 'labels', 'ui'])
  const navigate = useNavigate()
  const toast = useToast()
  const { id: projectId = '' } = useParams<{ id: string }>()
  const { data: project } = useProject(projectId)
  const { data: participants } = useParticipants(projectId)
  const create = useCreateProjectItem(projectId)
  const [tried, setTried] = useState(false)
  const [type, setType] = useState<ItemType>('decision')
  const [title, setTitle] = useState('')
  const [statement, setStatement] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [who, setWho] = useState('')
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [why, setWhy] = useState('')
  const [causation, setCausation] = useState('')
  const [owner, setOwner] = useState('')
  const [due, setDue] = useState('')
  const [done, setDone] = useState(false)
  const [consensus, setConsensus] = useState<Partial<Record<Discipline, ConsensusChoice>>>({})
  const [risk, setRisk] = useState<'' | 'low' | 'medium' | 'high'>('')
  const [cost, setCost] = useState('')
  const [timeline, setTimeline] = useState('')
  const [scope, setScope] = useState('')
  const names = useMemo(() => Array.from(new Set((participants ?? []).map((p) => p.name).filter(Boolean))), [participants])

  const errors = {
    statement: !statement.trim() ? t('newItem.errors.statement') : undefined,
    who: !who.trim() ? t('newItem.errors.who') : undefined,
    disciplines: disciplines.length === 0 ? t('newItem.errors.disciplines') : undefined,
  }
  const show = (key: keyof typeof errors) => (tried ? errors[key] : undefined)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (errors.statement || errors.who || errors.disciplines) return
    const consensusEntries = Object.entries(consensus).filter(([, status]) => !!status) as [Discipline, ConsensusEntry['status']][]
    const impacts = risk || cost || timeline || scope ? { risk_level: risk || null, cost_impact: cost || null, timeline_impact: timeline || null, scope_impact: scope || null } : undefined
    const body: ProjectItemCreate = {
      statement: statement.trim(),
      title: title.trim() || null,
      occurred_at: date ? `${date}T00:00:00` : null,
      item_type: type,
      who: who.trim(),
      affected_disciplines: disciplines,
      why: why.trim() || undefined,
      causation: causation.trim() || undefined,
      ...(type === 'action_item' ? { owner: owner.trim() || undefined, due_date: due || undefined, is_done: done } : {}),
      ...(consensusEntries.length ? { consensus: Object.fromEntries(consensusEntries.map(([d, status]) => [d, { status }])) } : {}),
      ...(impacts ? { impacts } : {}),
    }
    create.mutate(body, {
      onSuccess: (item) => {
        toast.show({ message: t('newItem.saved'), tone: 'success' })
        navigate(`/projects/${projectId}/history?item=${item.id}`)
      },
    })
  }

  const toggleDiscipline = (d: Discipline) => setDisciplines((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  return (
    <FormShell
      back={{ to: `/projects/${projectId}/history`, label: t('newItem.back') }}
      eyebrow={project?.name ?? t('newItem.eyebrow')}
      title={t('newItem.title')}
      subtitle={t('newItem.subtitle')}
      notice={project?.is_external ? <Banner>{t('newItem.externalNote')}</Banner> : undefined}
      onSubmit={submit}
      footer={
        <>
          {create.isError && <p className="mr-auto text-caption text-danger-ink">{t('newItem.errors.save')}</p>}
          <Button onClick={() => navigate(`/projects/${projectId}/history`)}>{t('newItem.cancel')}</Button>
          <Button type="submit" variant="primary" loading={create.isLoading}>
            {t('newItem.submit')}
          </Button>
        </>
      }
    >
      <FormSection title={t('newItem.sections.what')}>
        <div className="flex flex-col gap-1.5">
          <span className="text-small font-semibold text-ink">{t('newItem.fields.type')}</span>
          <SegmentedControl
            label={t('newItem.fields.type')}
            value={type}
            onValueChange={setType}
            options={ITEM_TYPE_ORDER.map((it) => ({
              value: it,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <ItemTypeIcon type={it} size={12} />
                  {t(`labels:itemType.${it}`)}
                </span>
              ),
            }))}
            className="flex-wrap self-start"
          />
        </div>
        <Field label={t('newItem.fields.title')} optional>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('newItem.fields.titlePlaceholder')} maxLength={255} />
        </Field>
        <Field label={t('newItem.fields.statement')} error={show('statement')}>
          <Textarea value={statement} onChange={(e) => setStatement(e.target.value)} placeholder={t('newItem.fields.statementPlaceholder')} rows={4} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('newItem.fields.date')}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('newItem.fields.who')} error={show('who')}>
            <Input value={who} onChange={(e) => setWho(e.target.value)} placeholder={t('newItem.fields.whoPlaceholder')} list="item-people" />
          </Field>
        </div>
        <datalist id="item-people">
          {names.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </FormSection>

      <FormSection title={t('newItem.sections.disciplines')} description={t('newItem.fields.disciplinesHelp')}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('newItem.sections.disciplines')}>
          {DISCIPLINE_ORDER.map((d) => (
            <Chip
              key={d}
              label={t(`labels:discipline.${d}`)}
              marker={<DisciplineMarker discipline={d} size="md" label="none" decorative />}
              selected={disciplines.includes(d)}
              onClick={() => toggleDiscipline(d)}
            />
          ))}
        </div>
        {show('disciplines') && <p className="text-caption text-danger-ink">{show('disciplines')}</p>}
      </FormSection>

      <FormSection title={t('newItem.sections.context')}>
        <Field label={t('newItem.fields.why')} optional>
          <Textarea value={why} onChange={(e) => setWhy(e.target.value)} placeholder={t('newItem.fields.whyPlaceholder')} />
        </Field>
        <Field label={t('newItem.fields.causation')} optional>
          <Textarea value={causation} onChange={(e) => setCausation(e.target.value)} rows={2} />
        </Field>
      </FormSection>

      {type === 'action_item' && (
        <FormSection title={t('newItem.sections.action')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('newItem.fields.owner')} optional>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} list="item-people" />
            </Field>
            <Field label={t('newItem.fields.due')} optional>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
          </div>
          <Checkbox checked={done} onCheckedChange={setDone} label={t('newItem.fields.done')} />
        </FormSection>
      )}

      <FormSection title={t('newItem.sections.consensus')} description={t('newItem.fields.consensusHelp')}>
        {disciplines.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {disciplines.map((d) => (
              <Field key={d} label={<span className="inline-flex items-center gap-1.5"><DisciplineMarker discipline={d} size="md" label="none" decorative />{t(`labels:discipline.${d}`)}</span>} optional>
                <Select
                  aria-label={t('newItem.fields.consensusFor', { discipline: t(`labels:discipline.${d}`) })}
                  value={consensus[d] || 'none'}
                  onValueChange={(value) => setConsensus((cur) => ({ ...cur, [d]: value === 'none' ? '' : (value as ConsensusChoice) }))}
                  options={[{ value: 'none', label: t('newItem.fields.consensusNone') }, ...CONSENSUS.map((s) => ({ value: s, label: t(`ui:consensus.${s}`) }))]}
                />
              </Field>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('newItem.fields.risk')} optional>
            <Select
              value={risk || 'none'}
              onValueChange={(value) => setRisk(value === 'none' ? '' : (value as 'low' | 'medium' | 'high'))}
              options={[
                { value: 'none', label: t('newItem.fields.riskNone') },
                { value: 'high', label: t('ui:impact.high') },
                { value: 'medium', label: t('ui:impact.medium') },
                { value: 'low', label: t('ui:impact.low') },
              ]}
            />
          </Field>
          <Field label={t('newItem.fields.cost')} optional>
            <Input value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Field label={t('newItem.fields.timeline')} optional>
            <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} />
          </Field>
          <Field label={t('newItem.fields.scope')} optional>
            <Input value={scope} onChange={(e) => setScope(e.target.value)} />
          </Field>
        </div>
      </FormSection>
    </FormShell>
  )
}
