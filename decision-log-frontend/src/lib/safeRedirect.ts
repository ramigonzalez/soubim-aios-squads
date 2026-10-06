/**
 * Post-login destination from an untrusted `?redirect=` value (Story 12.5 security review).
 *
 * Only same-origin relative paths are accepted: a single leading `/`, no `//` or `/\`
 * (protocol-relative: browsers treat `\` as `/`), no control characters or whitespace
 * (the URL parser strips tabs/newlines, so `/\t/evil.com` becomes `//evil.com`), and the
 * resolved URL must stay on this origin. Anything else falls back to `fallback`.
 */
export function safeRedirect(value: string | null | undefined, fallback = '/projects'): string {
  if (!value || !value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\u0000- \u007f\\]/.test(value)) return fallback
  try {
    const base = window.location.origin
    const url = new URL(value, base)
    if (url.origin !== base) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}
