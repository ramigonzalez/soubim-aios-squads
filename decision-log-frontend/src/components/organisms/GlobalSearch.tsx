/**
 * Global search ⌘K (UX-UI-GUIDELINES §5): one input, results grouped as Projetos · Itens ·
 * Reuniões in two-line rows, ↑/↓ + Enter, Esc closes. Opens from the sidebar, the mobile top
 * bar and ⌘K / Ctrl+K anywhere in the app. An item opens in its project's Histórico panel
 * (`?item=`), a meeting in the meeting viewer, a project on its Visão geral.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CommandDialog,
  CommandGroup,
  CommandOption,
  EmptyState,
  ErrorState,
  Icons,
  ItemTypeIcon,
  Kbd,
  SkeletonRows,
} from '../../design-system'
import { useDebounce } from '../../hooks/useDebounce'
import { SEARCH_MIN, useGlobalSearch } from '../../hooks/useGlobalSearch'
import { formatDay } from '../../lib/format'
import { useSearchStore } from '../../store/searchStore'

interface Option {
  key: string
  group: 'projects' | 'items' | 'meetings'
  icon: ReactNode
  title: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
  to: string
}

/** ⌘K / Ctrl+K opens the search anywhere in the signed-in app. */
export function useSearchShortcut() {
  const setOpen = useSearchStore((s) => s.setOpen)
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setOpen])
}

export function GlobalSearch() {
  const { open, setOpen } = useSearchStore()
  // a fresh body per opening: empty query, first row active
  return open ? <SearchBody onClose={() => setOpen(false)} /> : null
}

function SearchBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['nav', 'labels'])
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const debounced = useDebounce(query, 200)
  const search = useGlobalSearch(debounced)
  const listRef = useRef<HTMLDivElement>(null)
  const typedEnough = query.trim().length >= SEARCH_MIN
  const data = typedEnough ? search.data : undefined

  const options = useMemo<Option[]>(() => {
    if (!data) return []
    return [
      ...data.projects.map<Option>((p) => ({
        key: `p-${p.id}`,
        group: 'projects',
        icon: <Icons.projects className="h-4 w-4 text-ink" strokeWidth={1.75} aria-hidden />,
        title: p.name,
        meta: [p.archived ? t('search.archived') : null, p.description].filter(Boolean).join(' · ') || undefined,
        to: `/projects/${p.id}/overview`,
      })),
      ...data.items.map<Option>((i) => ({
        key: `i-${i.id}`,
        group: 'items',
        icon: <ItemTypeIcon type={i.item_type} done={i.is_done} />,
        title: i.title || i.statement,
        meta: (
          <>
            {i.is_milestone && (
              <span role="img" aria-label={t('search.milestone')} className="inline-flex shrink-0">
                <Icons.milestone aria-hidden className="h-3 w-3 fill-current text-accent" strokeWidth={1.75} />
              </span>
            )}
            <span className="truncate">{[t(`labels:itemType.${i.item_type}`), i.project_name].join(' · ')}</span>
          </>
        ),
        trailing: i.date ? formatDay(i.date) : undefined,
        to: `/projects/${i.project_id}/history?item=${i.id}`,
      })),
      ...data.meetings.map<Option>((m) => ({
        key: `m-${m.id}`,
        group: 'meetings',
        icon: <Icons.meetings className="h-4 w-4 text-ink" strokeWidth={1.75} aria-hidden />,
        title: m.title || t('labels:sourceType.meeting'),
        meta: m.project_name,
        trailing: m.occurred_at ? formatDay(m.occurred_at) : undefined,
        to: `/projects/${m.project_id}/meetings/${m.id}`,
      })),
    ]
  }, [data, t])

  // a new result set starts on its first row
  useEffect(() => setActive(0), [data])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  const go = (option: Option | undefined) => {
    if (!option) return
    onClose()
    navigate(option.to)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(options[active])
    }
  }

  const optionId = (index: number) => `search-option-${index}`
  const groups = (['projects', 'items', 'meetings'] as const).filter((g) => options.some((o) => o.group === g))
  const more = data && (data.more.projects || data.more.items || data.more.meetings)
  const Search = Icons.search

  const body = (() => {
    if (!typedEnough) return <p className="px-4 py-6 text-small text-ink-2">{t('search.hint')}</p>
    if (search.isError && !data) return <ErrorState title={t('search.error')} onRetry={() => void search.refetch()} className="py-6" />
    if (!data) return <SkeletonRows rows={4} rowClassName="h-row-2" className="px-4" />
    if (options.length === 0) return <EmptyState icon={<Search />} title={t('search.empty', { q: query.trim() })} text={t('search.emptyText')} />
    return (
      <div ref={listRef} role="listbox" id="search-results" aria-label={t('search.label')}>
        {groups.map((group) => (
          <CommandGroup key={group} id={`search-group-${group}`} label={t(`search.groups.${group}`)}>
            {options.map((option, index) =>
              option.group === group ? (
                <div key={option.key} data-index={index}>
                  <CommandOption
                    id={optionId(index)}
                    icon={option.icon}
                    title={option.title}
                    meta={option.meta}
                    trailing={option.trailing}
                    active={index === active}
                    onHover={() => setActive(index)}
                    onSelect={() => go(option)}
                  />
                </div>
              ) : null,
            )}
          </CommandGroup>
        ))}
        {more && <p className="px-4 pb-2 pt-1 text-caption text-ink-3">{t('search.more')}</p>}
      </div>
    )
  })()

  return (
    <CommandDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('search.label')}
      input={
        <div className="flex items-center gap-3 px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
          <input
            autoFocus
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls="search-results"
            aria-activedescendant={options.length ? optionId(active) : undefined}
            aria-label={t('search.label')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('search.placeholder')}
            className="h-14 min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none focus-visible:shadow-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="ds-touch shrink-0 rounded-sm px-1 text-caption font-medium text-ink-2 hover:text-ink"
            aria-label={t('search.close')}
          >
            <Kbd boxed>Esc</Kbd>
          </button>
        </div>
      }
      footer={
        <>
          <span>{t('search.keys.move')}</span>
          <span>{t('search.keys.open')}</span>
          <span>{t('search.keys.close')}</span>
        </>
      }
    >
      {body}
    </CommandDialog>
  )
}
