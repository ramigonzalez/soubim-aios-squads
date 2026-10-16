/**
 * Reversible item actions (README §8.2): they happen immediately (optimistic
 * update) with a toast offering "Desfazer" for 5 s. A failure reverts the
 * change and replaces the toast with an error.
 */
import { useTranslation } from 'react-i18next'
import { useToast } from '../design-system'
import type { ProjectItem } from '../types/projectItem'
import { useToggleDone, useToggleMilestone } from './useProjectItemMutation'

export function useItemActions(projectId: string) {
  const { t } = useTranslation('project')
  const toast = useToast()
  const milestone = useToggleMilestone(projectId)
  const done = useToggleDone(projectId)
  const onError = () => toast.show({ message: t('toast.error'), tone: 'error' })

  const setMilestone = (item: ProjectItem, value: boolean, undoable = true) => {
    milestone.mutate({ itemId: item.id, isMilestone: value }, { onError })
    if (undoable) {
      toast.show({
        message: t(value ? 'toast.milestoneOn' : 'toast.milestoneOff'),
        tone: 'milestone',
        onUndo: () => setMilestone(item, !value, false),
      })
    }
  }

  const setDone = (item: ProjectItem, value: boolean, undoable = true) => {
    done.mutate({ itemId: item.id, isDone: value }, { onError })
    if (undoable) {
      toast.show({
        message: t(value ? 'toast.done' : 'toast.reopened'),
        tone: 'success',
        onUndo: () => setDone(item, !value, false),
      })
    }
  }

  return {
    toggleMilestone: (item: ProjectItem) => setMilestone(item, !item.is_milestone),
    toggleDone: (item: ProjectItem) => setDone(item, !item.is_done),
  }
}
