/**
 * Histórico filters in the URL (README §4):
 * ?q=&disc=&type=&src=&mtype=&who=&from=&to=&group=date|discipline&rejected=1
 */
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DISCIPLINE_ORDER, ITEM_TYPE_ORDER, SOURCE_ORDER } from '../design-system'
import { itemDate, itemTitle } from '../lib/items'
import type { Discipline, ItemType, ProjectItem, SourceType } from '../types/projectItem'

export interface HistoryFilters {
  q: string
  disc: Discipline[]
  type: ItemType[]
  src: SourceType[]
  mtype: string[]
  who: string[]
  from: string | null
  to: string | null
  group: 'date' | 'discipline'
  rejected: boolean
}

const list = (raw: string | null) => (raw ? raw.split(',').filter(Boolean) : [])
const only = <T extends string>(values: string[], allowed: readonly T[]) => values.filter((v): v is T => (allowed as readonly string[]).includes(v))

export function useHistoryFilters() {
  const [params, setParams] = useSearchParams()

  const filters: HistoryFilters = useMemo(
    () => ({
      q: params.get('q') ?? '',
      disc: only(list(params.get('disc')), DISCIPLINE_ORDER),
      type: only(list(params.get('type')), ITEM_TYPE_ORDER),
      src: only(list(params.get('src')), SOURCE_ORDER),
      mtype: list(params.get('mtype')),
      who: list(params.get('who')),
      from: params.get('from'),
      to: params.get('to'),
      group: params.get('group') === 'discipline' ? 'discipline' : 'date',
      rejected: params.get('rejected') === '1',
    }),
    [params],
  )

  const update = useCallback(
    (patch: Partial<HistoryFilters>) => {
      const next = new URLSearchParams(params)
      const merged = { ...filters, ...patch }
      const put = (key: string, value: string | null) => (value ? next.set(key, value) : next.delete(key))
      put('q', merged.q.trim() ? merged.q : null)
      put('disc', merged.disc.join(','))
      put('type', merged.type.join(','))
      put('src', merged.src.join(','))
      put('mtype', merged.mtype.join(','))
      put('who', merged.who.join(','))
      put('from', merged.from)
      put('to', merged.to)
      put('group', merged.group === 'discipline' ? 'discipline' : null)
      put('rejected', merged.rejected ? '1' : null)
      setParams(next, { replace: true })
    },
    [params, filters, setParams],
  )

  const active = filters.q.trim() !== '' || filters.disc.length + filters.type.length + filters.src.length + filters.mtype.length + filters.who.length > 0 || !!filters.from || !!filters.to

  const clear = useCallback(() => update({ q: '', disc: [], type: [], src: [], mtype: [], who: [], from: null, to: null }), [update])

  return { filters, update, clear, active }
}

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR')

/** Apply the filters on the client (the list is fully loaded). Search ignores accents and case. */
export function filterItems(items: ProjectItem[], f: HistoryFilters): ProjectItem[] {
  const q = normalize(f.q.trim())
  return items.filter((item) => {
    if (f.disc.length && !item.affected_disciplines.some((d) => f.disc.includes(d))) return false
    if (f.type.length && !f.type.includes(item.item_type)) return false
    const source = item.source?.type ?? item.source_type
    if (f.src.length && !f.src.includes(source)) return false
    if (f.mtype.length && !(item.source?.meeting_type && f.mtype.includes(item.source.meeting_type))) return false
    if (f.who.length && !f.who.includes(item.who)) return false
    const day = itemDate(item).slice(0, 10)
    if (f.from && day < f.from) return false
    if (f.to && day > f.to) return false
    if (q) {
      const haystack = normalize([itemTitle(item), item.statement, item.who, item.owner, item.why, item.source?.title].filter(Boolean).join(' '))
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
