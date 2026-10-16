/**
 * The project the sidebar shows: the one in the URL, else the last one opened
 * (kept per browser, like a remembered tab). Firm pages (Ingestão, Projetos)
 * keep the project nav visible, as in the prototype.
 */
import { useEffect } from 'react'
import { useMatch } from 'react-router-dom'

const STORAGE_KEY = 'promem.lastProjectId'

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function write(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable (private mode): the sidebar just won't remember
  }
}

/** Project id from /projects/:id/* (not /projects/new). */
export function useRouteProjectId(): string | null {
  const match = useMatch('/projects/:id/*')
  const id = match?.params.id
  return id && id !== 'new' ? id : null
}

export function useCurrentProjectId(): { projectId: string | null; fromRoute: boolean; forget: () => void } {
  const routeId = useRouteProjectId()
  useEffect(() => {
    if (routeId) write(routeId)
  }, [routeId])
  return { projectId: routeId ?? read(), fromRoute: !!routeId, forget: () => write(null) }
}
