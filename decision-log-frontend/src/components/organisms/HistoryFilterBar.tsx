/**
 * Histórico FilterBar (COMPONENTS.md → FilterBar): search with the "/" hint,
 * menus Disciplina · Tipo · Fonte (+ tipo de reunião) · Quem, and Período.
 * Active filters show as removable chips with "Limpar filtros".
 */
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Chip,
  DateRange,
  DISCIPLINE_ORDER,
  DisciplineMarker,
  Icons,
  Input,
  ITEM_TYPE_ORDER,
  ItemTypeIcon,
  Kbd,
  SOURCE_ORDER,
  SourceIcon,
} from '../../design-system'
import { formatDayShortYear, formatDay } from '../../lib/format'
import type { HistoryFilters } from '../../hooks/useHistoryFilters'
import type { ProjectItem } from '../../types/projectItem'
import { FilterMenu } from '../molecules/FilterMenu'

export interface HistoryFilterBarProps {
  items: ProjectItem[]
  filters: HistoryFilters
  onChange: (patch: Partial<HistoryFilters>) => void
  onClear: () => void
  active: boolean
  loading?: boolean
}

export const HistoryFilterBar = forwardRef<HTMLInputElement, HistoryFilterBarProps>(function HistoryFilterBar(
  { items, filters, onChange, onClear, active, loading },
  searchRef,
) {
  const { t } = useTranslation(['project', 'labels'])
  const count = <T extends string>(key: (i: ProjectItem) => T | T[] | null | undefined) => {
    const counts = new Map<string, number>()
    for (const item of items) for (const v of [key(item)].flat()) if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
    return counts
  }
  const discCounts = count((i) => i.affected_disciplines)
  const typeCounts = count((i) => i.item_type)
  const srcCounts = count((i) => i.source?.type ?? i.source_type)
  const meetingTypeCounts = count((i) => i.source?.meeting_type)
  const whoCounts = count((i) => i.who)
  const people = Array.from(whoCounts.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const meetingTypes = Array.from(meetingTypeCounts.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const Search = Icons.search
  const menu = (key: string) => ({ activeLabel: (n: number) => `${t(`history.filters.${key}`)} · ${n}`, clearLabel: t('history.filters.clearMenu') })

  const chips = [
    ...(filters.q.trim() ? [{ key: 'q', label: t('history.filters.searchChip', { q: filters.q.trim() }), remove: () => onChange({ q: '' }) }] : []),
    ...filters.disc.map((d) => ({
      key: `d-${d}`,
      label: t(`labels:discipline.${d}`),
      marker: <DisciplineMarker discipline={d} size="md" label="none" decorative />,
      remove: () => onChange({ disc: filters.disc.filter((x) => x !== d) }),
    })),
    ...filters.type.map((type) => ({
      key: `t-${type}`,
      label: t(`labels:itemType.${type}`),
      marker: <ItemTypeIcon type={type} size={12} />,
      remove: () => onChange({ type: filters.type.filter((x) => x !== type) }),
    })),
    ...filters.src.map((s) => ({
      key: `s-${s}`,
      label: t(`labels:sourceType.${s}`),
      marker: <SourceIcon type={s} />,
      remove: () => onChange({ src: filters.src.filter((x) => x !== s) }),
    })),
    ...filters.mtype.map((m) => ({ key: `m-${m}`, label: m, remove: () => onChange({ mtype: filters.mtype.filter((x) => x !== m) }) })),
    ...filters.who.map((w) => ({ key: `w-${w}`, label: w, remove: () => onChange({ who: filters.who.filter((x) => x !== w) }) })),
    ...(filters.from || filters.to
      ? [
          {
            key: 'period',
            label: `${filters.from ? formatDay(filters.from) : '…'} → ${filters.to ? formatDayShortYear(filters.to) : '…'}`,
            marker: <Icons.calendar className="h-3 w-3 text-ink-2" strokeWidth={1.75} aria-hidden />,
            remove: () => onChange({ from: null, to: null }),
          },
        ]
      : []),
  ]

  return (
    <div role="search" aria-label={t('history.filters.label')} className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={searchRef}
          size="toolbar"
          className="min-w-60 flex-1"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder={loading ? t('history.searchLabel') : t('history.search', { count: items.length })}
          aria-label={t('history.searchLabel')}
          leadingIcon={<Search />}
          trailing={<Kbd boxed>/</Kbd>}
        />
        <FilterMenu
          label={t('history.filters.discipline')}
          {...menu('discipline')}
          selected={filters.disc}
          onChange={(disc) => onChange({ disc })}
          options={DISCIPLINE_ORDER.filter((d) => discCounts.has(d) || filters.disc.includes(d)).map((d) => ({
            value: d,
            label: t(`labels:discipline.${d}`),
            marker: <DisciplineMarker discipline={d} size="md" label="none" decorative />,
            count: discCounts.get(d) ?? 0,
          }))}
        />
        <FilterMenu
          label={t('history.filters.type')}
          {...menu('type')}
          selected={filters.type}
          onChange={(type) => onChange({ type })}
          options={ITEM_TYPE_ORDER.map((type) => ({
            value: type,
            label: t(`labels:itemType.${type}`),
            marker: <ItemTypeIcon type={type} size={14} />,
            count: typeCounts.get(type) ?? 0,
          }))}
        />
        <FilterMenu
          label={t('history.filters.source')}
          {...menu('source')}
          selected={filters.src}
          onChange={(src) => onChange({ src })}
          options={SOURCE_ORDER.map((s) => ({ value: s, label: t(`labels:sourceType.${s}`), marker: <SourceIcon type={s} />, count: srcCounts.get(s) ?? 0 }))}
        />
        {meetingTypes.length > 0 && (
          <FilterMenu
            label={t('history.filters.meetingType')}
            {...menu('meetingType')}
            selected={filters.mtype}
            onChange={(mtype) => onChange({ mtype })}
            options={meetingTypes.map((m) => ({ value: m, label: m, count: meetingTypeCounts.get(m) ?? 0 }))}
          />
        )}
        <FilterMenu
          label={t('history.filters.who')}
          {...menu('who')}
          selected={filters.who}
          onChange={(who) => onChange({ who })}
          options={people.map((p) => ({ value: p, label: p, count: whoCounts.get(p) ?? 0 }))}
        />
        <DateRange value={{ from: filters.from, to: filters.to }} onChange={({ from, to }) => onChange({ from, to })} placeholder={t('history.filters.period')} />
      </div>
      {active && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <Chip key={chip.key} label={chip.label} marker={'marker' in chip ? chip.marker : undefined} onRemove={chip.remove} />
          ))}
          <Button variant="link" size="sm" className="ml-1" onClick={onClear}>
            {t('history.filters.clear')}
          </Button>
        </div>
      )}
    </div>
  )
})
