/**
 * The item SidePanel lives in the URL (`?item=:id`, README §4): deep links open
 * it, browser Back closes it, ↑/↓ walk the page's visible order (replacing the
 * URL, so Back still closes). On close, focus returns to the item's row.
 */
import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

type PanelState = { itemPanel?: boolean } | null

function focusRow(itemId: string) {
  requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(itemId)}"]`)
    row?.focus()
  })
}

export function useItemPanel(order: string[]) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const itemId = params.get('item')
  const index = itemId ? order.indexOf(itemId) : -1

  const open = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params)
      next.set('item', id)
      const state = (location.state as PanelState) ?? {}
      // the first open pushes a history entry (Back closes); switching items replaces it
      navigate({ search: `?${next}` }, { replace: !!itemId, state: { ...state, itemPanel: state.itemPanel || !itemId } })
    },
    [params, location.state, navigate, itemId],
  )

  const close = useCallback(() => {
    if (!itemId) return
    const closing = itemId
    if ((location.state as PanelState)?.itemPanel) {
      navigate(-1)
    } else {
      const next = new URLSearchParams(params)
      next.delete('item')
      setParams(next, { replace: true })
    }
    focusRow(closing)
  }, [itemId, location.state, navigate, params, setParams])

  const move = useCallback(
    (delta: 1 | -1) => {
      const target = order[index + delta]
      if (!target) return
      const next = new URLSearchParams(params)
      next.set('item', target)
      setParams(next, { replace: true, state: location.state })
    },
    [order, index, params, setParams, location.state],
  )

  return {
    itemId,
    open,
    close,
    previous: () => move(-1),
    next: () => move(1),
    hasPrevious: index > 0,
    hasNext: index >= 0 && index < order.length - 1,
  }
}
