import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ConsensusList,
  DisciplineList,
  DisciplineMarker,
  DueBadge,
  ImpactIndicator,
  ItemTypeBadge,
  ItemTypeIcon,
  MilestoneStar,
  SourceTile,
  StageStrip,
  Wordmark,
} from '../../design-system'
import { renderUi, usePortuguese } from './render'

const TODAY = new Date(2026, 2, 3)

describe('design-system domain components', () => {
  usePortuguese()

  it('Wordmark is one image named Promem, optionally endorsed', () => {
    renderUi(<Wordmark endorsed />)
    expect(screen.getByRole('img', { name: 'Promem' })).toBeInTheDocument()
  })

  describe('DisciplineMarker', () => {
    it('shows the code in rows with the full name for screen readers', () => {
      renderUi(<DisciplineMarker discipline="fire_protection" />)
      expect(screen.getByText('INC')).toBeInTheDocument()
      expect(screen.getByText('Prevenção de incêndio')).toBeInTheDocument()
    })

    it('shows the full or explicit short name', () => {
      renderUi(
        <>
          <DisciplineMarker discipline="landscape" label="name" />
          <DisciplineMarker discipline="fire_protection" label="short" />
        </>,
      )
      expect(screen.getByText('Paisagismo')).toBeInTheDocument()
      expect(screen.getByText('Incêndio')).toBeInTheDocument()
    })

    it('falls back to Geral for unknown values', () => {
      renderUi(<DisciplineMarker discipline="unknown" />)
      expect(screen.getByText('GER')).toBeInTheDocument()
    })
  })

  it('DisciplineList shows two codes then +N with every name', () => {
    renderUi(<DisciplineList disciplines={['architecture', 'structural', 'mep', 'landscape']} />)
    expect(screen.getByText('ARQ')).toBeInTheDocument()
    expect(screen.getByText('EST')).toBeInTheDocument()
    expect(screen.queryByText('INS')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Disciplinas: Arquitetura, Estrutura, Instalações, Paisagismo')).toHaveTextContent('+2')
  })

  describe('ItemTypeIcon', () => {
    it('toggles an action as a pressed button', async () => {
      const onToggle = vi.fn()
      const { rerender } = renderUi(<ItemTypeIcon type="action_item" onToggleDone={onToggle} />)
      await userEvent.click(screen.getByRole('button', { name: 'Marcar ação como concluída' }))
      expect(onToggle).toHaveBeenCalled()
      rerender(<ItemTypeIcon type="action_item" done onToggleDone={onToggle} />)
      expect(screen.getByRole('button', { name: 'Reabrir ação' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('is not a button for other types', () => {
      renderUi(<ItemTypeIcon type="decision" onToggleDone={() => undefined} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  it('ItemTypeBadge uses the domain vocabulary', () => {
    renderUi(
      <>
        <ItemTypeBadge type="decision" />
        <ItemTypeBadge type="topic" />
      </>,
    )
    expect(screen.getByText('Decisão')).toBeInTheDocument()
    expect(screen.getByText('Tópico')).toBeInTheDocument()
  })

  it('SourceTile is labelled with the source kind', () => {
    renderUi(<SourceTile type="meeting" />)
    expect(screen.getByRole('img', { name: 'Reunião' })).toBeInTheDocument()
  })

  describe('MilestoneStar', () => {
    it('is a toggle with aria-pressed', async () => {
      const onToggle = vi.fn()
      renderUi(<MilestoneStar pressed={false} onToggle={onToggle} />)
      const star = screen.getByRole('button', { name: 'Marcar como marco' })
      expect(star).toHaveAttribute('aria-pressed', 'false')
      await userEvent.click(star)
      expect(onToggle).toHaveBeenCalled()
    })

    it('is read-only without onToggle', () => {
      renderUi(<MilestoneStar pressed />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  it('ImpactIndicator pairs the bars with text', () => {
    renderUi(<ImpactIndicator level="medium" />)
    expect(screen.getByText('Impacto médio')).toBeInTheDocument()
  })

  describe('ConsensusList', () => {
    it('summarises agreement and labels every state', () => {
      renderUi(
        <ConsensusList
          rows={[
            { discipline: 'landscape', status: 'AGREE' },
            { discipline: 'structural', status: 'MIXED', notes: 'Rever carga.' },
            { discipline: 'client', status: 'DISAGREE' },
            { discipline: 'mep', status: 'ABSTAIN' },
          ]}
        />,
      )
      expect(screen.getByText('1 de 4 concordam')).toHaveClass('text-danger-ink')
      for (const label of ['Concorda', 'Com ressalvas', 'Discorda', 'Sem posição', 'Rever carga.']) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }
    })

    it('is success when everyone agrees, and absent when empty', () => {
      const { container, rerender } = renderUi(<ConsensusList rows={[{ discipline: 'landscape', status: 'AGREE' }]} />)
      expect(screen.getByText('1 de 1 concordam')).toHaveClass('text-success')
      rerender(<ConsensusList rows={[]} />)
      expect(container.querySelector('section')).toBeNull()
    })
  })

  it('DueBadge shows open, late and done', () => {
    renderUi(
      <>
        <DueBadge due="2026-03-13" today={TODAY} />
        <DueBadge due="2026-02-10" today={TODAY} />
        <DueBadge due="2026-02-13" done today={TODAY} />
      </>,
    )
    expect(screen.getByText('até 13/03')).toBeInTheDocument()
    expect(screen.getByText('atrasada · 10/02')).toBeInTheDocument()
    expect(screen.getByText('concluída · 13/02')).toBeInTheDocument()
  })

  it('StageStrip labels the current stage with hoje and the days left', () => {
    renderUi(
      <StageStrip
        today={TODAY}
        stages={[
          { id: 'ep', name: 'Estudo Preliminar', start: '2026-01-15', end: '2026-02-15' },
          { id: 'ap', name: 'Anteprojeto', start: '2026-02-16', end: '2026-03-31' },
        ]}
      />,
    )
    const current = screen.getByText('Anteprojeto').closest('li')!
    expect(current).toHaveAttribute('aria-current', 'step')
    expect(current).toHaveTextContent('hoje, 03/03')
    expect(current).toHaveTextContent('16/02 – 31/03 · faltam 28 dias')
  })
})
