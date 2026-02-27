import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisciplineCircles } from '../../components/atoms/DisciplineCircles'
import type { Discipline } from '../../types/projectItem'

describe('DisciplineCircles', () => {
  const fiveDisciplines: Discipline[] = ['architecture', 'structural', 'mep', 'electrical', 'plumbing']

  it('shows max 3 circles by default', () => {
    render(<DisciplineCircles disciplines={fiveDisciplines} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.queryByText('E')).not.toBeInTheDocument()
  })

  it('shows overflow count', () => {
    render(<DisciplineCircles disciplines={fiveDisciplines} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('does not show overflow when within max', () => {
    render(<DisciplineCircles disciplines={['architecture', 'structural']} />)
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
  })

  it('first circle is marked as primary', () => {
    render(<DisciplineCircles disciplines={['architecture', 'structural']} />)
    const firstCircle = screen.getByText('A')
    expect(firstCircle.className).toContain('ring-2')
  })

  it('subsequent circles have -ml-1 overlap', () => {
    render(<DisciplineCircles disciplines={['architecture', 'structural']} />)
    const secondCircle = screen.getByText('S')
    expect(secondCircle.className).toContain('-ml-1')
  })

  it('respects custom max prop', () => {
    render(<DisciplineCircles disciplines={fiveDisciplines} max={2} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.queryByText('M')).not.toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
  })
})
