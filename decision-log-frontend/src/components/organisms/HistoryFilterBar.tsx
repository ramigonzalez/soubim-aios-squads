/**
 * Histórico FilterBar (COMPONENTS.md → FilterBar): search with the "/" hint,
 * menus Disciplina · Tipo · Fonte (+ tipo de reunião) · Quem, and Período.
 * Active filters show as removable chips with "Limpar filtros".
 * Phones (README §7): search, then "Filtros · N" opening a BottomSheet with toggle chips,
 * "Limpar" and a sticky "Ver N itens"; then the active chips.
 */
import { forwardRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BottomSheet,
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
  useIsMobile,
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
  /** Items the current filters show ("Ver N itens" on phones) */
  resultCount?: number
}

export const HistoryFilterBar = forwardRef<HTMLInputElement, HistoryFilterBarProps>(function HistoryFilterBar(
  { items, filters, onChange, onClear, active, loading, resultCount },
  searchRef,
) {
  const { t } = useTranslation(['project', 'labels'])
  const mobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
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

  const search = (
    <Input
      ref={searchRef}
      size="toolbar"
      className="min-w-0 flex-1 md:min-w-60"
      value={filters.q}
      onChange={(e) => onChange({ q: e.target.value })}
      placeholder={loading ? t('history.searchLabel') : t('history.search', { count: items.length })}
      aria-label={t('history.searchLabel')}
      leadingIcon={<Search />}
      trailing={mobile ? undefined : <Kbd boxed>/</Kbd>}
    />
  )

  if (mobile) {
    const filterCount = chips.filter((c) => c.key !== 'q').length
    const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
    const group = (title: string, children: ReactNode) => (
      <section className="flex flex-col gap-2.5 pt-3">
        <h3 className="text-label uppercase text-ink-2">{title}</h3>
        <div className="flex flex-wrap gap-2">{children}</div>
      </section>
    )
    return (
      <div role="search" aria-label={t('history.filters.label')} className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          {search}
          <Button
            icon={<Icons.filter />}
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className={filterCount ? 'h-11 border-ink bg-accent-weak' : 'h-11'}
          >
            {filterCount ? t('history.filters.openCount', { count: filterCount }) : t('history.filters.open')}
          </Button>
        </div>
        {active && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <Chip key={chip.key} touch label={chip.label} marker={'marker' in chip ? chip.marker : undefined} onRemove={chip.remove} />
            ))}
          </div>
        )}
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={t('history.filters.sheet')}
          action={
            <Button variant="link" onClick={() => onChange({ disc: [], type: [], src: [], mtype: [], who: [], from: null, to: null })}>
              {t('history.filters.clearMenu')}
            </Button>
          }
          footer={
            <Button variant="primary" size="lg" className="w-full" onClick={() => setSheetOpen(false)}>
              {t('history.filters.show', { count: resultCount ?? items.length })}
            </Button>
          }
        >
          {group(
            t('history.filters.discipline'),
            DISCIPLINE_ORDER.filter((d) => discCounts.has(d) || filters.disc.includes(d)).map((d) => (
              <Chip
                key={d}
                touch
                label={t(`labels:discipline.${d}`)}
                marker={<DisciplineMarker discipline={d} size="md" label="none" decorative />}
                selected={filters.disc.includes(d)}
                onClick={() => onChange({ disc: toggle(filters.disc, d) as HistoryFilters['disc'] })}
              />
            )),
          )}
          {group(
            t('history.filters.type'),
            ITEM_TYPE_ORDER.map((type) => (
              <Chip
                key={type}
                touch
                label={t(`labels:itemType.${type}`)}
                marker={<ItemTypeIcon type={type} size={12} />}
                selected={filters.type.includes(type)}
                onClick={() => onChange({ type: toggle(filters.type, type) as HistoryFilters['type'] })}
              />
            )),
          )}
          {group(
            t('history.filters.source'),
            SOURCE_ORDER.map((s) => (
              <Chip
                key={s}
                touch
                label={t(`labels:sourceType.${s}`)}
                marker={<SourceIcon type={s} />}
                selected={filters.src.includes(s)}
                onClick={() => onChange({ src: toggle(filters.src, s) as HistoryFilters['src'] })}
              />
            )),
          )}
          {meetingTypes.length > 0 &&
            group(
              t('history.filters.meetingType'),
              meetingTypes.map((m) => (
                <Chip key={m} touch label={m} selected={filters.mtype.includes(m)} onClick={() => onChange({ mtype: toggle(filters.mtype, m) })} />
              )),
            )}
          {people.length > 0 &&
            group(
              t('history.filters.who'),
              people.map((p) => <Chip key={p} touch label={p} selected={filters.who.includes(p)} onClick={() => onChange({ who: toggle(filters.who, p) })} />),
            )}
          {group(
            t('history.filters.period'),
            <DateRange
              size="form"
              className="w-full"
              value={{ from: filters.from, to: filters.to }}
              onChange={({ from, to }) => onChange({ from, to })}
              placeholder={t('history.filters.period')}
            />,
          )}
        </BottomSheet>
      </div>
    )
  }

  return (
    <div role="search" aria-label={t('history.filters.label')} className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {search}
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
