import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisciplineCircle } from '../../components/atoms/DisciplineCircle'
import { DisciplineCircles } from '../../components/atoms/DisciplineCircles'

describe('DisciplineCircle', () => {
  it('renders with correct initial for known discipline', () => {
    render(<DisciplineCircle discipline="architecture" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders with correct initial for MEP discipline', () => {
    render(<DisciplineCircle discipline="mep" />)
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('renders with title attribute for discipline name', () => {
    render(<DisciplineCircle discipline="structural" />)
    const circle = screen.getByTitle('structural')
    expect(circle).toBeInTheDocument()
  })

  it('applies isPrimary ring styling', () => {
    render(<DisciplineCircle discipline="architecture" isPrimary />)
    const circle = screen.getByText('A')
    expect(circle.className).toContain('ring-2')
  })

  it('does not apply ring styling when not primary', () => {
    render(<DisciplineCircle discipline="architecture" isPrimary={false} />)
    const circle = screen.getByText('A')
    expect(circle.className).not.toContain('ring-2')
  })

  it('applies correct size classes', () => {
    const { rerender } = render(<DisciplineCircle discipline="mep" size="sm" />)
    expect(screen.getByText('M').className).toContain('w-5')

    rerender(<DisciplineCircle discipline="mep" size="lg" />)
    expect(screen.getByText('M').className).toContain('w-8')
  })

  it('falls back to first letter for unknown discipline', () => {
    render(<DisciplineCircle discipline="xenoarchitecture" />)
    expect(screen.getByText('X')).toBeInTheDocument()
  })
})

describe('DisciplineCircles', () => {
  it('renders correct number of circles', () => {
    render(<DisciplineCircles disciplines={['architecture', 'mep', 'structural']} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('limits visible circles to max prop', () => {
    render(<DisciplineCircles disciplines={['architecture', 'mep', 'structural', 'electrical', 'plumbing']} max={2} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
    // The remaining 3 should be in overflow
    expect(screen.queryByTitle('structural')).not.toBeInTheDocument()
    expect(screen.queryByTitle('electrical')).not.toBeInTheDocument()
    expect(screen.queryByTitle('plumbing')).not.toBeInTheDocument()
  })

  it('renders overflow "+N" when disciplines exceed max', () => {
    render(<DisciplineCircles disciplines={['architecture', 'mep', 'structural', 'electrical']} max={2} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('does not render overflow when disciplines fit within max', () => {
    render(<DisciplineCircles disciplines={['architecture', 'mep']} max={3} />)
    expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument()
  })

  it('overflow tooltip shows remaining discipline names', () => {
    render(<DisciplineCircles disciplines={['architecture', 'mep', 'structural', 'electrical']} max={2} />)
    // Tooltip content is rendered in DOM (hidden by CSS), check for text
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip.textContent).toContain('Structural')
    expect(tooltip.textContent).toContain('Electrical')
  })

  it('renders nothing for empty disciplines array', () => {
    const { container } = render(<DisciplineCircles disciplines={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing for undefined-like empty input', () => {
    const { container } = render(<DisciplineCircles disciplines={[]} max={3} />)
    expect(container.innerHTML).toBe('')
  })

  it('marks first discipline as primary', () => {
    render(<DisciplineCircles disciplines={['architecture', 'mep']} />)
    const archCircle = screen.getByText('A')
    expect(archCircle.className).toContain('ring-2')
    const mepCircle = screen.getByText('M')
    expect(mepCircle.className).not.toContain('ring-2')
  })

  it('passes size prop through to DisciplineCircle', () => {
    render(<DisciplineCircles disciplines={['architecture']} size="lg" />)
    const circle = screen.getByText('A')
    expect(circle.className).toContain('w-8')
  })

  it('is wrapped with React.memo (displayName check)', () => {
    // React.memo wrapping can be verified by checking the component type
    expect(DisciplineCircles).toBeDefined()
    // Memo components have a $$typeof Symbol
    expect((DisciplineCircles as any).$$typeof).toBeDefined()
  })
})

describe('Multi-discipline filter OR logic', () => {
  // Test the filter logic that would be applied in ProjectDetail
  // We test the pure logic here without rendering the full page

  const KNOWN_DISCIPLINES = new Set([
    'engineer', 'architect', 'client', 'contractor',
    'structural', 'mep', 'electrical', 'plumbing',
    'landscape', 'acoustical', 'fire_protection', 'tenant',
    'sustainability', 'civil',
  ])

  interface MockDecision {
    id: string
    discipline: string
    consensus?: Record<string, string>
  }

  function filterByDisciplines(decisions: MockDecision[], selectedDisciplines: string[]): MockDecision[] {
    if (selectedDisciplines.length === 0) return decisions
    return decisions.filter(d => {
      if (d.discipline && selectedDisciplines.includes(d.discipline.toLowerCase())) {
        return true
      }
      if (d.consensus) {
        return Object.keys(d.consensus).some(key =>
          selectedDisciplines.includes(key.toLowerCase())
        )
      }
      return false
    })
  }

  const mockDecisions: MockDecision[] = [
    {
      id: '1',
      discipline: 'architecture',
      consensus: { architect: 'agree', structural: 'agree' },
    },
    {
      id: '2',
      discipline: 'mep',
      consensus: { mep: 'agree', electrical: 'agree' },
    },
    {
      id: '3',
      discipline: 'landscape',
    },
  ]

  it('item with [architecture, structural] is found when filtering "structural"', () => {
    const result = filterByDisciplines(mockDecisions, ['structural'])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('item with [architecture] is NOT found when filtering "mep"', () => {
    const result = filterByDisciplines(
      [{ id: '1', discipline: 'architecture' }],
      ['mep']
    )
    expect(result).toHaveLength(0)
  })

  it('matches on primary discipline', () => {
    const result = filterByDisciplines(mockDecisions, ['architecture'])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('matches on consensus key discipline (OR logic)', () => {
    const result = filterByDisciplines(mockDecisions, ['electrical'])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('returns all when filter is empty', () => {
    const result = filterByDisciplines(mockDecisions, [])
    expect(result).toHaveLength(3)
  })

  it('matches multiple filter values with OR logic', () => {
    const result = filterByDisciplines(mockDecisions, ['architecture', 'mep'])
    expect(result).toHaveLength(2)
  })
})
