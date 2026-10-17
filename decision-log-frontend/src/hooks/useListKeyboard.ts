/**
 * List keyboard map (README §8.1): ↑/↓ move focus between rows (`[data-item-id]`
 * inside the container), Enter opens (handled by the row), M toggles marco,
 * X toggles done, `/` focuses the search. Ignored while typing in a field.
 */
import { useEffect, type RefObject } from 'react'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export function useListKeyboard({
  container,
  search,
  onMilestone,
  onDone,
  enabled = true,
}: {
  container: RefObject<HTMLElement>
  search?: RefObject<HTMLInputElement>
  onMilestone?: (itemId: string) => void
  onDone?: (itemId: string) => void
  enabled?: boolean
}) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
      // the item panel handles its own keys while it has focus
      if (event.target instanceof HTMLElement && event.target.closest('[role="dialog"]')) return
      if (event.key === '/' && search?.current) {
        event.preventDefault()
        search.current.focus()
        return
      }
      const root = container.current
      if (!root) return
      const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-item-id][tabindex]'))
      const current = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('[data-item-id]') : null
      const index = current ? rows.indexOf(current) : -1
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!rows.length) return
        event.preventDefault()
        const next = event.key === 'ArrowDown' ? Math.min(rows.length - 1, index + 1) : Math.max(0, index - 1)
        rows[index === -1 ? 0 : next]?.focus()
        return
      }
      const id = current?.dataset.itemId
      if (!id) return
      if ((event.key === 'm' || event.key === 'M') && onMilestone) onMilestone(id)
      if ((event.key === 'x' || event.key === 'X') && onDone) onDone(id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [container, search, onMilestone, onDone, enabled])
}
