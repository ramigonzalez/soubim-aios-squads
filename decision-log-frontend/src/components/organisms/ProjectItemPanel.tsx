/**
 * Connects a project page's list to the item SidePanel: `?item=` in the URL,
 * the page's visible order for ↑/↓, a fetch when a deep-linked item isn't in
 * the list, and the reversible actions (marco, done) with "Desfazer".
 */
import type { ProjectItem } from '../../types/projectItem'
import type { StageInput } from '../../lib/stages'
import { useItemActions } from '../../hooks/useItemActions'
import { useProjectItem } from '../../hooks/useProjectItem'
import { ItemDetailPanel } from './ItemDetailPanel'

export interface ProjectItemPanelProps {
  projectId: string
  /** Items the page has loaded (any order) */
  items: ProjectItem[]
  /** The panel's ↑/↓ order: ids as the list shows them */
  panel: ReturnType<typeof import('../../hooks/useItemPanel').useItemPanel>
  stages: StageInput[]
  canManage: boolean
  canReview: boolean
  /** The page's list has loaded: only then is a missing item fetched on its own */
  listReady: boolean
}

export function ProjectItemPanel({ projectId, items, panel, stages, canManage, canReview, listReady }: ProjectItemPanelProps) {
  const listed = panel.itemId ? items.find((i) => i.id === panel.itemId) : undefined
  const fetched = useProjectItem(projectId, panel.itemId, listReady && !!panel.itemId && !listed)
  const actions = useItemActions(projectId)
  const item = listed ?? fetched.data
  return (
    <ItemDetailPanel
      projectId={projectId}
      open={!!panel.itemId}
      item={item}
      loading={!listed && (!listReady || fetched.isLoading)}
      error={!listed && fetched.isError}
      stages={stages}
      canManage={canManage}
      canReview={canReview}
      hasPrevious={panel.hasPrevious}
      hasNext={panel.hasNext}
      onPrevious={panel.previous}
      onNext={panel.next}
      onClose={panel.close}
      onOpenItem={panel.open}
      onToggleMilestone={actions.toggleMilestone}
      onToggleDone={actions.toggleDone}
    />
  )
}
