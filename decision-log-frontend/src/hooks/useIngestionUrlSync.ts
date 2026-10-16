/**
 * Ingestão deep links (README §4): /ingestion?tab=pending|history&project=&source=.
 * The URL seeds the store on arrival; later changes write back (replace, no history entries).
 */
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useIngestionStore } from '../store/ingestionStore'

const TABS = ['pending', 'history'] as const
const SOURCES = ['meeting', 'email', 'document'] as const

export function useIngestionUrlSync() {
  const [params, setParams] = useSearchParams()
  const { activeTab, filters, setActiveTab, setFilter } = useIngestionStore()
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const tab = params.get('tab')
    if (tab && (TABS as readonly string[]).includes(tab)) setActiveTab(tab as (typeof TABS)[number])
    const project = params.get('project')
    if (project) setFilter('project_id', project)
    const source = params.get('source')
    if (source && (SOURCES as readonly string[]).includes(source)) setFilter('source_type', source)
  }, [params, setActiveTab, setFilter])

  useEffect(() => {
    if (!seeded.current) return
    const next = new URLSearchParams()
    if (activeTab !== 'pending') next.set('tab', activeTab)
    if (filters.project_id) next.set('project', filters.project_id)
    if (filters.source_type) next.set('source', filters.source_type)
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [activeTab, filters.project_id, filters.source_type, params, setParams])
}
