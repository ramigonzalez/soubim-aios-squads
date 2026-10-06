import { describe, it, expect } from 'vitest'
import { safeRedirect } from '../../lib/safeRedirect'

describe('safeRedirect (login ?redirect=)', () => {
  it('keeps same-origin relative paths', () => {
    expect(safeRedirect('/invite/abc_-123')).toBe('/invite/abc_-123')
    expect(safeRedirect('/projects/1?tab=a#x')).toBe('/projects/1?tab=a#x')
  })

  it.each([
    null,
    '',
    'https://evil.com',
    'javascript:alert(1)',
    'evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\\/evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    ' /projects',
    '/foo\\bar',
  ])('rejects %j', value => {
    expect(safeRedirect(value)).toBe('/projects')
  })

  it('uses the given fallback', () => {
    expect(safeRedirect('//evil.com', '/')).toBe('/')
  })
})
