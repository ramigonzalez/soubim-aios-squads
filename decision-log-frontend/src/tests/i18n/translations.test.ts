import { describe, it, expect, afterEach } from 'vitest'
import i18n, { DEFAULT_LANGUAGE } from '../../i18n'
import { formatDate, formatDenseDate, getDisciplineLabel, getItemTypeLabel, getSourceTypeLabel } from '../../lib/utils'

type Tree = Record<string, unknown>

function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as Tree, `${prefix}${k}.`) : [`${prefix}${k}`]
  )
}

const ptBR = import.meta.glob<Tree>('../../i18n/locales/pt-BR/*.json', { eager: true, import: 'default' })
const en = import.meta.glob<Tree>('../../i18n/locales/en/*.json', { eager: true, import: 'default' })
const nsOf = (path: string) => path.split('/').pop()!.replace('.json', '')

describe('translation files (Story 11.1)', () => {
  it('Portuguese is the default language', () => {
    expect(DEFAULT_LANGUAGE).toBe('pt-BR')
  })

  it('every namespace exists in both languages', () => {
    expect(Object.keys(ptBR).map(nsOf).sort()).toEqual(Object.keys(en).map(nsOf).sort())
  })

  it.each(Object.keys(ptBR).map(nsOf))('namespace "%s" has the same keys in pt-BR and en', ns => {
    const pt = ptBR[`../../i18n/locales/pt-BR/${ns}.json`]
    const english = en[`../../i18n/locales/en/${ns}.json`]
    expect(keys(pt).sort()).toEqual(keys(english).sort())
  })

  it('no translation is empty', () => {
    for (const [path, tree] of [...Object.entries(ptBR), ...Object.entries(en)]) {
      for (const k of keys(tree)) {
        const value = k.split('.').reduce<unknown>((node, part) => (node as Tree)[part], tree)
        expect(String(value).trim(), `${path} → ${k}`).not.toBe('')
      }
    }
  })
})

describe('shared labels and dates in Portuguese', () => {
  afterEach(() => i18n.changeLanguage('en'))

  it('translates disciplines, item types and source types', async () => {
    await i18n.changeLanguage('pt-BR')
    expect(getDisciplineLabel('architecture')).toBe('Arquitetura')
    expect(getDisciplineLabel('client')).toBe('Cliente')
    expect(getItemTypeLabel('action_item')).toBe('Ação')
    expect(getSourceTypeLabel('meeting')).toBe('Reunião')
  })

  it('formats dates in Portuguese', async () => {
    await i18n.changeLanguage('pt-BR')
    expect(formatDate('2026-09-04')).toBe('4 de set. de 2026')
    expect(formatDenseDate('2026-09-04')).toBe('4 SET 2026')
  })

  it('keeps English output in English', () => {
    expect(getDisciplineLabel('architecture')).toBe('Architecture')
    expect(formatDate('2026-09-04')).toBe('Sep 4, 2026')
    expect(formatDenseDate('2026-09-04')).toBe('SEP 4, 2026')
  })
})
