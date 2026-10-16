/**
 * Signed-out card (UX-UI-GUIDELINES §5 → Login): `bg` page, a centred 400 px `surface` card
 * with radius lg and a `line` border, the endorsed lockup on top. Used by login, the Google
 * callback and invitations.
 */
import type { ReactNode } from 'react'
import { Wordmark } from '../../design-system'

export function AuthShell({ title, description, children }: { title?: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="flex w-full max-w-auth flex-col gap-6 rounded-lg border border-line bg-surface p-6 sm:p-8">
        <Wordmark size={24} endorsed />
        {(title || description) && (
          <div className="flex flex-col gap-1.5">
            {title && <h1 className="text-h2 text-ink [text-wrap:balance]">{title}</h1>}
            {description && <p className="text-small text-ink-2 [text-wrap:pretty]">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </main>
  )
}
