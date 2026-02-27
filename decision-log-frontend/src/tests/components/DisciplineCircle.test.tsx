import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisciplineCircle } from '../../components/atoms/DisciplineCircle'

describe('DisciplineCircle', () => {
  it('renders initial letter for discipline', () => {
    render(<DisciplineCircle discipline="architecture" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders correct background color', () => {
    render(<DisciplineCircle discipline="structural" />)
    const circle = screen.getByText('S')
    expect(circle).toHaveStyle({ backgroundColor: '#8B5CF6' })
  })

  it('shows ring for primary discipline', () => {
    render(<DisciplineCircle discipline="mep" isPrimary />)
    const circle = screen.getByText('M')
    expect(circle.className).toContain('ring-2')
  })

  it('does not show ring by default', () => {
    render(<DisciplineCircle discipline="mep" />)
    const circle = screen.getByText('M')
    expect(circle.className).not.toContain('ring-2')
  })

  it('renders sm size', () => {
    render(<DisciplineCircle discipline="civil" size="sm" />)
    const circle = screen.getByText('C')
    expect(circle.className).toContain('w-5')
    expect(circle.className).toContain('h-5')
  })

  it('renders md size by default', () => {
    render(<DisciplineCircle discipline="civil" />)
    const circle = screen.getByText('C')
    expect(circle.className).toContain('w-6')
    expect(circle.className).toContain('h-6')
  })

  it('has aria-label for accessibility', () => {
    render(<DisciplineCircle discipline="landscape" />)
    expect(screen.getByLabelText('landscape')).toBeInTheDocument()
  })
})
