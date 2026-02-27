import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StagePill } from '../../components/molecules/StagePill'

describe('StagePill', () => {
  it('renders stage name', () => {
    render(<StagePill stageName="Estudo Preliminar" />)
    expect(screen.getByText('Estudo Preliminar')).toBeInTheDocument()
  })

  it('shows current indicator dot when isCurrent is true', () => {
    const { container } = render(<StagePill stageName="Projeto Legal" isCurrent />)
    const dot = container.querySelector('.rounded-full.bg-blue-500')
    expect(dot).toBeInTheDocument()
  })

  it('does not show current indicator dot when isCurrent is false', () => {
    const { container } = render(<StagePill stageName="Projeto Legal" />)
    const dot = container.querySelector('.bg-blue-500.w-1\\.5')
    expect(dot).not.toBeInTheDocument()
  })

  it('has correct base styling', () => {
    const { container } = render(<StagePill stageName="Execução" />)
    const pill = container.firstElementChild
    expect(pill?.className).toContain('rounded-full')
    expect(pill?.className).toContain('bg-blue-100')
    expect(pill?.className).toContain('text-blue-700')
  })
})
