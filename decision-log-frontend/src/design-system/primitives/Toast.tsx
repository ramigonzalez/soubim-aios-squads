import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, Star, TriangleAlert } from 'lucide-react'
import { cn } from '../cn'
import { Icons } from '../icons'

export type ToastTone = 'success' | 'milestone' | 'error' | 'neutral'

export interface ToastOptions {
  message: ReactNode
  tone?: ToastTone
  /** "Desfazer": called once if the user clicks before the toast expires */
  onUndo?: () => void
  /** "Tentar de novo" for error toasts */
  onRetry?: () => void
  /** Lifetime in ms; defaults to --toast-ms (5000) */
  duration?: number
}

interface ToastState extends ToastOptions {
  id: number
}

interface ToastApi {
  show: (options: ToastOptions) => void
  dismiss: () => void
}

const ToastContext = createContext<ToastApi | null>(null)

function readToastMs(): number {
  if (typeof window === 'undefined') return 5000
  const value = Number(getComputedStyle(document.documentElement).getPropertyValue('--toast-ms'))
  return Number.isFinite(value) && value > 0 ? value : 5000
}

const TONE_ICONS: Record<Exclude<ToastTone, 'neutral'>, { Icon: typeof CircleCheck; className: string }> = {
  success: { Icon: CircleCheck, className: 'text-success-on-dark' },
  milestone: { Icon: Star, className: 'fill-current text-accent-on-dark' },
  error: { Icon: TriangleAlert, className: 'text-danger-on-dark' },
}

/**
 * One toast at a time; a new one replaces the current one (COMPONENTS.md §2).
 * Bottom-left on desktop, bottom-centre above the tab bar on mobile.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('ui')
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const nextId = useRef(0)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback((options: ToastOptions) => {
    clearTimeout(timer.current)
    nextId.current += 1
    setToast({ ...options, id: nextId.current })
  }, [])

  useEffect(() => {
    if (!toast) return
    timer.current = setTimeout(() => setToast(null), toast.duration ?? readToastMs())
    return () => clearTimeout(timer.current)
  }, [toast])

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])
  const tone = toast?.tone && toast.tone !== 'neutral' ? TONE_ICONS[toast.tone] : null
  const Close = Icons.close

  const act = (handler?: () => void) => () => {
    dismiss()
    handler?.()
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(66px+env(safe-area-inset-bottom))] z-[60] flex justify-center md:inset-x-auto md:bottom-6 md:left-6 md:justify-start"
      >
        {toast && (
          <div
            key={toast.id}
            className="ds-pop-in pointer-events-auto flex max-w-[420px] items-center gap-2.5 rounded-md bg-ink py-2.5 pl-3.5 pr-2 text-small font-medium text-on-dark shadow-2"
          >
            {tone && <tone.Icon className={cn('h-4 w-4 shrink-0', tone.className)} strokeWidth={1.75} aria-hidden />}
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.onUndo && (
              <button type="button" onClick={act(toast.onUndo)} className="shrink-0 px-1.5 font-semibold text-accent-on-dark hover:text-on-dark">
                {t('toast.undo')}
              </button>
            )}
            {toast.onRetry && (
              <button type="button" onClick={act(toast.onRetry)} className="shrink-0 px-1.5 font-semibold text-accent-on-dark hover:text-on-dark">
                {t('toast.retry')}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('toast.dismiss')}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-on-dark-3 hover:text-on-dark"
            >
              <Close className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

/** Show a toast from anywhere under ToastProvider. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
