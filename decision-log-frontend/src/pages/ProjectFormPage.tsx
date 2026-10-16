/**
 * Criar / Editar projeto (README §5.9, COMPONENTS.md → ProjectForm parts): one column of numbered
 * section cards — 1 · Dados do projeto, 2 · Etapas (templates, live StageStrip, editable rows,
 * duration, date checks), 3 · Equipe (fixed discipline list, optional role), 4 · Google Drive —
 * then, when editing, access and integrations and the "Arquivar" danger zone.
 * Edit mode pre-fills everything (fixing the old empty stage dates).
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import {
  Banner,
  Button,
  Chip,
  Dialog,
  DISCIPLINE_ORDER,
  DisciplineMarker,
  ErrorState,
  Field,
  IconButton,
  Icons,
  Input,
  Select,
  SkeletonRows,
  StageStrip,
  Textarea,
  useToast,
} from '../design-system'
import { FormSection, FormShell } from '../components/templates/FormShell'
import { FormContainer } from '../components/templates/PageContainer'
import DriveFolderSection from '../components/organisms/DriveFolderSection'
import ExternalPeopleSection from '../components/organisms/ExternalPeopleSection'
import FathomRulesSection from '../components/organisms/FathomRulesSection'
import ProjectSharing from '../components/organisms/ProjectSharing'
import { useCreateProject, useArchiveProject, useUpdateProject } from '../hooks/useProjectMutation'
import { useParticipants } from '../hooks/useParticipants'
import { useProject } from '../hooks/useProject'
import { useStages } from '../hooks/useStages'
import { useStageTemplates } from '../hooks/useStageTemplates'
import { toDate } from '../lib/format'
import api from '../services/api'
import type { Discipline } from '../types/projectItem'

const PROJECT_TYPES = ['residential', 'commercial', 'mixed-use', 'institutional', 'infrastructure'] as const
const ROLES = ['director', 'coordinator', 'designer', 'consultant', 'client', 'supplier'] as const

interface StageDraft {
  key: string
  name: string
  start: string
  end: string
}
interface PersonDraft {
  key: string
  name: string
  email: string
  discipline: Discipline
  role: string
}

let seq = 0
const key = () => `k${(seq += 1)}`
const iso = (d: Date) => format(d, 'yyyy-MM-dd')

/** Date problems per the platform's rules (the API rejects inverted and overlapping stages). */
export function stageProblems(stages: StageDraft[]): { kind: 'missing' | 'inverted' | 'overlap'; a: string; b?: string; keys: string[] }[] {
  const problems: { kind: 'missing' | 'inverted' | 'overlap'; a: string; b?: string; keys: string[] }[] = []
  const complete = stages.filter((s) => s.name.trim() && s.start && s.end)
  if (complete.length !== stages.length) problems.push({ kind: 'missing', a: '', keys: stages.filter((s) => !complete.includes(s)).map((s) => s.key) })
  for (const s of complete) if (s.end <= s.start) problems.push({ kind: 'inverted', a: s.name, keys: [s.key] })
  const sorted = [...complete].sort((x, y) => x.start.localeCompare(y.start))
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].start < sorted[i - 1].end) problems.push({ kind: 'overlap', a: sorted[i - 1].name, b: sorted[i].name, keys: [sorted[i - 1].key, sorted[i].key] })
  }
  return problems
}

export default function ProjectFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { t } = useTranslation(['project', 'labels', 'projects'])
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { id = '' } = useParams<{ id: string }>()
  const editing = mode === 'edit'
  const project = useProject(editing ? id : undefined)
  const stagesQuery = useStages({ projectId: id, enabled: editing })
  const peopleQuery = useParticipants(editing ? id : '')
  const templates = useStageTemplates()
  const create = useCreateProject()
  const update = useUpdateProject(id)

  const [loaded, setLoaded] = useState(!editing)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('')
  const [startDate, setStartDate] = useState(() => iso(new Date()))
  const [stages, setStages] = useState<StageDraft[]>([])
  const [people, setPeople] = useState<PersonDraft[]>([])

  // Edit mode: pre-fill once everything has loaded
  useEffect(() => {
    if (!editing || loaded || !project.data || !stagesQuery.data || !peopleQuery.data) return
    setName(project.data.name)
    setDescription(project.data.description ?? '')
    setType(project.data.project_type ?? '')
    const loadedStages = stagesQuery.data.stages.map((s) => ({ key: key(), name: s.stage_name, start: (s.stage_from ?? '').slice(0, 10), end: (s.stage_to ?? '').slice(0, 10) }))
    setStages(loadedStages)
    if (loadedStages[0]?.start) setStartDate(loadedStages[0].start)
    setPeople(peopleQuery.data.map((p) => ({ key: key(), name: p.name, email: p.email ?? '', discipline: (p.discipline as Discipline) || 'general', role: p.role ?? '' })))
    setLoaded(true)
  }, [editing, loaded, project.data, stagesQuery.data, peopleQuery.data])

  const problems = useMemo(() => stageProblems(stages), [stages])
  const problemKeys = new Set(problems.flatMap((p) => p.keys))
  const nameError = tried && !name.trim() ? t('projectForm.nameRequired') : undefined
  const preview = stages
    .filter((s) => s.name && s.start && s.end && s.end > s.start)
    .map((s) => ({ id: s.key, name: s.name, start: s.start, end: s.end }))

  const applyTemplate = (templateId: string) => {
    const template = templates.data?.templates.find((tpl) => tpl.id === templateId)
    if (!template) return
    let cursor = toDate(startDate) ?? new Date()
    setStages(
      template.stages.map((s) => {
        const start = cursor
        const end = addDays(start, s.default_duration_days)
        cursor = addDays(end, 1)
        return { key: key(), name: s.stage_name, start: iso(start), end: iso(end) }
      }),
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (!name.trim() || problems.length) return
    setSaving(true)
    setFailed(false)
    try {
      let projectId = id
      const body = { title: name.trim(), description: description.trim(), project_type: type || undefined }
      if (editing) await update.mutateAsync(body)
      else projectId = ((await create.mutateAsync(body)) as { id: string }).id
      const stageBody = stages.map((s) => ({ stage_name: s.name.trim(), stage_from: s.start, stage_to: s.end }))
      if (editing || stageBody.length) await api.post(`/projects/${projectId}/stages`, stageBody)
      if (editing) for (const existing of peopleQuery.data ?? []) await api.delete(`/projects/${projectId}/participants/${existing.id}`)
      for (const person of people.filter((p) => p.name.trim())) {
        await api.post(`/projects/${projectId}/participants`, {
          name: person.name.trim(),
          email: person.email.trim() || undefined,
          discipline: person.discipline,
          role: person.role.trim() || undefined,
        })
      }
      void queryClient.invalidateQueries(['project', projectId])
      void queryClient.invalidateQueries(['stages', projectId])
      void queryClient.invalidateQueries(['participants', projectId])
      void queryClient.invalidateQueries('projects')
      toast.show({ message: editing ? t('projectForm.saved') : t('projectForm.created'), tone: 'success' })
      navigate(editing ? `/projects/${projectId}/overview` : `/projects/${projectId}/edit`)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  if (editing && (project.isLoading || stagesQuery.isLoading || peopleQuery.isLoading || (!loaded && !project.isError))) {
    return (
      <FormContainer>
        <SkeletonRows rows={8} rowClassName="h-12" />
      </FormContainer>
    )
  }
  if (editing && (project.isError || !project.data)) {
    return <ErrorState title={t('projectForm.loadError')} onRetry={() => void project.refetch()} />
  }

  const canManage = !editing || !!project.data?.can_manage
  const back = editing ? { to: `/projects/${id}/overview`, label: t('projectForm.backOverview') } : { to: '/projects', label: t('projectForm.backProjects') }
  const stageError = tried && problems.length > 0
  const roleOptions = (current: string) => {
    const known = ROLES.map((r) => ({ value: r, label: t(`projectForm.roles.${r}`) }))
    const fixed = ROLES.find((r) => t(`projectForm.roles.${r}`) === current)
    // keep a free-text role typed before the fixed list existed
    const extra = current && !fixed && !ROLES.includes(current as (typeof ROLES)[number]) ? [{ value: current, label: current }] : []
    return [{ value: 'none', label: t('projectForm.roles.none') }, ...known, ...extra]
  }

  return (
    <FormShell
      back={back}
      title={editing ? t('projectForm.editTitle') : t('projectForm.createTitle')}
      subtitle={editing ? t('projectForm.editSubtitle') : t('projectForm.createSubtitle')}
      onSubmit={submit}
      footer={
        canManage ? (
          <>
            {failed && <p className="mr-auto text-caption text-danger-ink">{t('projectForm.saveError')}</p>}
            <Button onClick={() => navigate(back.to)}>{t('projectForm.cancel')}</Button>
            <Button type="submit" form="project-form" variant="primary" loading={saving}>
              {editing ? t('projectForm.save') : t('projectForm.create')}
            </Button>
          </>
        ) : null
      }
      formId="project-form"
      after={
        editing && project.data ? (
          <EditSections id={id} name={name} canManage={canManage} isExternal={!!project.data.is_external} />
        ) : undefined
      }
    >
      {canManage && (
        <>
          <FormSection title={t('projectForm.sections.details')}>
            <Field label={t('projectForm.name')} error={nameError}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('projectForm.namePlaceholder')} maxLength={255} />
            </Field>
            <Field label={t('projectForm.description')} optional>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('projectForm.descriptionPlaceholder')} rows={2} />
            </Field>
            <Field label={t('projectForm.type')} optional>
              <Select
                value={type || 'none'}
                onValueChange={(v) => setType(v === 'none' ? '' : v)}
                options={[{ value: 'none', label: t('projectForm.typeNone') }, ...PROJECT_TYPES.map((pt) => ({ value: pt, label: t(`projects:form.type.options.${pt}`) }))]}
              />
            </Field>
          </FormSection>

          <FormSection title={t('projectForm.sections.stages')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('projectForm.startDate')} help={t('projectForm.startDateHelp')}>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
            </div>
            {(templates.data?.templates.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-small text-ink-2">{t('projectForm.templates')}</span>
                {templates.data!.templates.map((tpl) => (
                  <Chip key={tpl.id} label={tpl.template_name} onClick={() => applyTemplate(tpl.id)} />
                ))}
              </div>
            )}
            {preview.length > 0 && (
              <div className="rounded-md bg-surface-2 px-4 py-3">
                <StageStrip stages={preview} />
              </div>
            )}
            {stages.length === 0 ? (
              <p className="rounded-md border border-dashed border-line-strong px-4 py-5 text-center text-small text-ink-2">{t('projectForm.noStages')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="hidden grid-cols-stage-row gap-2 text-label uppercase text-ink-2 sm:grid">
                  <span>{t('projectForm.stageColumns.name')}</span>
                  <span>{t('projectForm.stageColumns.start')}</span>
                  <span>{t('projectForm.stageColumns.end')}</span>
                  <span>{t('projectForm.stageColumns.duration')}</span>
                  <span />
                </div>
                {stages.map((stage, index) => {
                  const bad = tried && problemKeys.has(stage.key)
                  const days = stage.start && stage.end ? differenceInCalendarDays(toDate(stage.end)!, toDate(stage.start)!) : null
                  const patch = (p: Partial<StageDraft>) => setStages((cur) => cur.map((s) => (s.key === stage.key ? { ...s, ...p } : s)))
                  return (
                    <div key={stage.key} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-stage-row">
                      <Input
                        className="col-span-2 sm:col-span-1"
                        aria-label={`${t('projectForm.stageName')} ${index + 1}`}
                        value={stage.name}
                        placeholder={t('projectForm.stagePlaceholder')}
                        onChange={(e) => patch({ name: e.target.value })}
                        tone={bad && !stage.name.trim() ? 'error' : 'default'}
                      />
                      <Input type="date" aria-label={`${t('projectForm.start')} ${index + 1}`} value={stage.start} onChange={(e) => patch({ start: e.target.value })} tone={bad ? 'error' : 'default'} />
                      <Input type="date" aria-label={`${t('projectForm.end')} ${index + 1}`} value={stage.end} onChange={(e) => patch({ end: e.target.value })} tone={bad ? 'error' : 'default'} />
                      <span className="font-mono text-mono text-ink-2">{days != null && days > 0 ? t('projectForm.days', { count: days }) : '—'}</span>
                      <IconButton
                        label={t('projectForm.removeStage', { name: stage.name || index + 1 })}
                        icon={<Icons.remove />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setStages((cur) => cur.filter((s) => s.key !== stage.key))}
                      />
                    </div>
                  )
                })}
              </div>
            )}
            {stageError && (
              <div className="flex flex-col gap-1">
                {problems.map((p, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-caption text-danger-ink">
                    <Icons.warning className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                    {p.kind === 'missing'
                      ? t('projectForm.stageErrors.missing')
                      : p.kind === 'inverted'
                        ? t('projectForm.stageErrors.inverted', { name: p.a })
                        : t('projectForm.stageErrors.overlap', { a: p.a, b: p.b })}
                  </p>
                ))}
              </div>
            )}
            <Button
              size="sm"
              icon={<Icons.add />}
              className="self-start"
              onClick={() => {
                const last = stages[stages.length - 1]
                const start = last?.end ? addDays(toDate(last.end)!, 1) : toDate(startDate) ?? new Date()
                setStages((cur) => [...cur, { key: key(), name: '', start: iso(start), end: iso(addDays(start, 30)) }])
              }}
            >
              {t('projectForm.addStage')}
            </Button>
          </FormSection>

          <FormSection title={t('projectForm.sections.team')} description={t('projectForm.teamHelp')}>
            {people.length === 0 ? (
              <p className="rounded-md border border-dashed border-line-strong px-4 py-5 text-center text-small text-ink-2">{t('projectForm.noPeople')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="hidden grid-cols-team-row gap-2 text-label uppercase text-ink-2 md:grid">
                  <span>{t('projectForm.teamColumns.name')}</span>
                  <span>{t('projectForm.teamColumns.email')}</span>
                  <span>{t('projectForm.teamColumns.discipline')}</span>
                  <span>{t('projectForm.teamColumns.role')}</span>
                  <span />
                </div>
                {people.map((person, index) => {
                  const patch = (p: Partial<PersonDraft>) => setPeople((cur) => cur.map((x) => (x.key === person.key ? { ...x, ...p } : x)))
                  return (
                    <div key={person.key} className="grid grid-cols-2 items-center gap-2 md:grid-cols-team-row">
                      <Input aria-label={`${t('projectForm.personName')} ${index + 1}`} value={person.name} onChange={(e) => patch({ name: e.target.value })} />
                      <Input type="email" aria-label={`${t('projectForm.personEmail')} ${index + 1}`} value={person.email} onChange={(e) => patch({ email: e.target.value })} />
                      <Select
                        aria-label={`${t('projectForm.personDiscipline')} ${index + 1}`}
                        value={person.discipline}
                        onValueChange={(v) => patch({ discipline: v as Discipline })}
                        options={DISCIPLINE_ORDER.map((d) => ({ value: d, label: t(`labels:discipline.${d}`), marker: <DisciplineMarker discipline={d} size="md" label="none" decorative /> }))}
                      />
                      <Select
                        aria-label={`${t('projectForm.personRole')} ${index + 1}`}
                        value={person.role ? ROLES.find((r) => r === person.role || t(`projectForm.roles.${r}`) === person.role) ?? person.role : 'none'}
                        onValueChange={(v) => patch({ role: v === 'none' ? '' : v })}
                        options={roleOptions(person.role)}
                      />
                      <IconButton
                        label={t('projectForm.removePerson', { name: person.name || index + 1 })}
                        icon={<Icons.remove />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setPeople((cur) => cur.filter((x) => x.key !== person.key))}
                      />
                    </div>
                  )
                })}
              </div>
            )}
            <Button
              size="sm"
              icon={<Icons.add />}
              className="self-start"
              onClick={() => setPeople((cur) => [...cur, { key: key(), name: '', email: '', discipline: 'general', role: '' }])}
            >
              {t('projectForm.addPerson')}
            </Button>
          </FormSection>

          {!editing && (
            <FormSection title={t('projectForm.sections.drive')}>
              <Banner>{t('projectForm.driveCreate')}</Banner>
            </FormSection>
          )}
        </>
      )}
    </FormShell>
  )
}

/** Edit-only sections with their own forms and saving (outside the project form). */
function EditSections({
  id,
  name,
  canManage,
  isExternal,
}: {
  id: string
  name: string
  canManage: boolean
  isExternal: boolean
}) {
  const { t } = useTranslation('project')
  const navigate = useNavigate()
  const archive = useArchiveProject()
  const [archiveOpen, setArchiveOpen] = useState(false)
  return (
    <>
      {canManage && <DriveFolderSection projectId={id} title={t('projectForm.sections.drive')} />}

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 text-ink">{t('projectForm.sections.more')}</h2>
        {canManage && <ProjectSharing projectId={id} />}
        {canManage && <ExternalPeopleSection projectId={id} />}
        {!isExternal && <FathomRulesSection projectId={id} />}
      </section>

      {canManage && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-danger-line bg-surface p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-h3 text-ink">{t('projectForm.danger.title')}</h2>
            <p className="text-small text-ink-2">{t('projectForm.danger.text')}</p>
          </div>
          <Button className="text-danger-ink" onClick={() => setArchiveOpen(true)}>
            {t('projectForm.danger.button')}
          </Button>
          <Dialog
            open={archiveOpen}
            onOpenChange={setArchiveOpen}
            title={t('header.archiveTitle')}
            description={t('header.archiveText', { name })}
            footer={
              <>
                {archive.isError && <p className="mr-auto text-caption text-danger-ink">{t('header.archiveError')}</p>}
                <Button onClick={() => setArchiveOpen(false)}>{t('header.cancel')}</Button>
                <Button variant="primary" loading={archive.isLoading} onClick={() => archive.mutate(id, { onSuccess: () => navigate('/projects') })}>
                  {t('header.archiveConfirm')}
                </Button>
              </>
            }
          />
        </section>
      )}
    </>
  )
}
