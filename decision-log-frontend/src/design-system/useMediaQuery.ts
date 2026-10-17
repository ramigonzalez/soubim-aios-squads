import { useEffect, useState } from 'react'

/** Live `matchMedia` result. Server/test environments without matchMedia read as false. */
export function useMediaQuery(query: string): boolean {
  const read = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false)
  const [matches, setMatches] = useState(read)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    onChange()
    list.addEventListener?.('change', onChange)
    return () => list.removeEventListener?.('change', onChange)
  }, [query])
  return matches
}

/** Phones (README §7: ≤ 767 px): the mobile shell, sheets instead of menus, full-screen detail. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
