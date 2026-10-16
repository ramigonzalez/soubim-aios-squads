/** A comma-separated list in the query string (?type=decision,action_item), restricted to known values. */
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useListParam<T extends string>(name: string, allowed: readonly T[]): [T[], (next: T[]) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get(name)
  const value = useMemo(
    () => (raw ? (raw.split(',').filter((v) => (allowed as readonly string[]).includes(v)) as T[]) : []),
    [raw, allowed],
  )
  const set = useCallback(
    (next: T[]) => {
      const updated = new URLSearchParams(params)
      if (next.length) updated.set(name, next.join(','))
      else updated.delete(name)
      setParams(updated, { replace: true })
    },
    [params, setParams, name],
  )
  return [value, set]
}
