/**
 * Header shared by the project pages (README §5.1, COMPONENTS.md → ProjectHeader):
 * eyebrow, project name, description · participants, actions and the StageStrip.
 * Actions: [Exportar PDF] on Marcos · [Enviar documento] on Visão geral and Histórico ·
 * primary [Compartilhar marcos] · [⋯] Editar / Arquivar. Each follows the user's capabilities.
 */
import { useState, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Dialog,
  IconButton,
  Icons,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Skeleton,
  StageStrip,
  useToast,
} from '../../design-system'
import { useProject } from '../../hooks/useProject'
import { useParticipants } from '../../hooks/useParticipants'
import { useArchiveProject } from '../../hooks/useProjectMutation'
import { exportAsJPEG, exportAsPDF } from '../../lib/exportTimeline'
import { ShareMilestonesDialog } from './ShareMilestonesDialog'
import { UploadDocumentButton } from '../molecules/UploadDocumentButton'
import type { ProjectSection } from './Sidebar'

const WRITE_LEVELS = ['write', 'review', 'admin']

export interface ProjectHeaderProps {
  projectId: string
  section: ProjectSection
  /** Marcos: the element exported to PDF / JPEG */
  exportTarget?: RefObject<HTMLElement>
}

export function ProjectHeader({ projectId, section, exportTarget }: ProjectHeaderProps) {
  const { t } = useTranslation('project')
  const navigate = useNavigate()
  const toast = useToast()
  const { data: project, isLoading } = useProject(projectId)
  const { data: participants } = useParticipants(projectId)
  const archive = useArchiveProject()
  const [shareOpen, setShareOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  if (isLoading || !project) {
    return (
      <header className="flex flex-col gap-3" aria-busy>
        <Skeleton width="20%" />
        <Skeleton width="45%" className="h-7" />
        <Skeleton width="35%" />
      </header>
    )
  }

  const canManage = !!project.can_manage
  const canWrite = WRITE_LEVELS.includes(project.access_level ?? '')
  const canReview = !!project.can_review
  const participantCount = participants?.length ?? 0
  const description = [project.description, participantCount ? t('header.participants', { count: participantCount }) : null]
    .filter(Boolean)
    .join(' · ')

  const runExport = async (format: 'pdf' | 'jpeg') => {
    if (!exportTarget?.current) return
    setExporting(true)
    try {
      await (format === 'pdf' ? exportAsPDF : exportAsJPEG)(exportTarget.current, project.name)
    } catch {
      toast.show({ message: t('header.exportError'), tone: 'error', onRetry: () => void runExport(format) })
    } finally {
      setExporting(false)
    }
  }

  const More = Icons.more
  const Download = Icons.download
  const Link = Icons.link
  const showMenu = canManage || canReview

  return (
    <header className="flex flex-col gap-5" data-export-exclude>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-label uppercase text-ink-2">{t(`header.eyebrow.${section}`)}</p>
          <h1 className="text-h1 text-ink [text-wrap:balance]">{project.name}</h1>
          {description && <p className="text-small text-ink-2">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {section === 'milestones' && canManage && exportTarget && (
            <Menu>
              <MenuTrigger asChild>
                <Button icon={<Download />} loading={exporting}>
                  {exporting ? t('header.exporting') : t('header.exportPdf')}
                </Button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem icon={<Download />} onSelect={() => void runExport('pdf')}>
                  {t('header.exportPdf')}
                </MenuItem>
                <MenuItem icon={<Download />} onSelect={() => void runExport('jpeg')}>
                  {t('header.exportJpeg')}
                </MenuItem>
              </MenuContent>
            </Menu>
          )}
          {(section === 'overview' || section === 'history') && canWrite && <UploadDocumentButton projectId={projectId} />}
          {section === 'history' && canWrite && (
            <Button icon={<Icons.add />} onClick={() => navigate(`/projects/${projectId}/items/new`)}>
              {t('header.addItem')}
            </Button>
          )}
          {canManage && (
            <Button variant="primary" icon={<Link />} onClick={() => setShareOpen(true)}>
              {t('header.share')}
            </Button>
          )}
          {showMenu && (
            <Menu>
              <MenuTrigger asChild>
                <IconButton label={t('header.more')} icon={<More />} />
              </MenuTrigger>
              <MenuContent>
                <MenuItem icon={<Icons.manual />} onSelect={() => navigate(`/projects/${projectId}/edit`)}>
                  {canManage ? t('header.edit') : t('header.fathomRules')}
                </MenuItem>
                {canManage && (
                  <>
                    <MenuSeparator />
                    <MenuItem destructive icon={<Icons.remove />} onSelect={() => setArchiveOpen(true)}>
                      {t('header.archive')}
                    </MenuItem>
                  </>
                )}
              </MenuContent>
            </Menu>
          )}
        </div>
      </div>

      {project.stages?.length > 0 && <StageStrip stages={project.stages} />}

      {canManage && <ShareMilestonesDialog projectId={projectId} open={shareOpen} onOpenChange={setShareOpen} />}
      <Dialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={t('header.archiveTitle')}
        description={t('header.archiveText', { name: project.name })}
        footer={
          <>
            {archive.isError && <p className="mr-auto text-caption text-danger-ink">{t('header.archiveError')}</p>}
            <Button onClick={() => setArchiveOpen(false)}>{t('header.cancel')}</Button>
            <Button
              variant="primary"
              loading={archive.isLoading}
              onClick={() => archive.mutate(projectId, { onSuccess: () => navigate('/projects') })}
            >
              {t('header.archiveConfirm')}
            </Button>
          </>
        }
      />
    </header>
  )
}
