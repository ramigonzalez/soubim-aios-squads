import { describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Badge,
  Button,
  Checkbox,
  Chip,
  cn,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Icons,
  Input,
  KeyValueList,
  SegmentedControl,
  SkeletonRows,
  Tab,
  Tabs,
  TabsContent,
  TabsList,
  useToast,
} from '../../design-system'
import { renderUi, usePortuguese } from './render'

describe('cn', () => {
  it('keeps a Promem font size and a text colour together', () => {
    expect(cn('text-small', 'text-ink-2')).toBe('text-small text-ink-2')
  })
  it('lets a later size win over an earlier one', () => {
    expect(cn('text-small', 'text-caption')).toBe('text-caption')
  })
})

describe('design-system primitives', () => {
  usePortuguese()

  describe('Button', () => {
    it('renders the label and the keyboard hint', () => {
      renderUi(<Button variant="primary" shortcut="A">Aprovar</Button>)
      const button = screen.getByRole('button', { name: /Aprovar/ })
      expect(button).toHaveTextContent('A')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('is disabled and busy while loading', () => {
      renderUi(<Button loading>Salvar alterações</Button>)
      const button = screen.getByRole('button', { name: /Salvar alterações/ })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByLabelText('Carregando…')).toBeInTheDocument()
    })

    it('renders a child element with asChild', () => {
      renderUi(
        <Button asChild>
          <a href="/projects">Projetos</a>
        </Button>,
      )
      expect(screen.getByRole('link', { name: 'Projetos' })).toHaveAttribute('href', '/projects')
    })
  })

  it('IconButton requires and exposes a label', () => {
    renderUi(<IconButton label="Mais ações" icon={<Icons.more />} />)
    expect(screen.getByRole('button', { name: 'Mais ações' })).toBeInTheDocument()
  })

  describe('Field', () => {
    it('links the label, the help text and marks optional fields', () => {
      renderUi(
        <Field label="Descrição" optional help="Aparece abaixo do nome.">
          <Input />
        </Field>,
      )
      const input = screen.getByLabelText(/Descrição/)
      expect(screen.getByText(/opcional/)).toBeInTheDocument()
      expect(input).toHaveAccessibleDescription('Aparece abaixo do nome.')
    })

    it('shows the error with an invalid control', () => {
      renderUi(
        <Field label="Nome do projeto" error="Dê um nome ao projeto para continuar.">
          <Input />
        </Field>,
      )
      const input = screen.getByLabelText('Nome do projeto')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAccessibleDescription('Dê um nome ao projeto para continuar.')
    })
  })

  it('Checkbox toggles through its label', async () => {
    const onChange = vi.fn()
    renderUi(<Checkbox checked={false} onCheckedChange={onChange} label="Só com pendências" />)
    await userEvent.click(screen.getByText('Só com pendências'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('SegmentedControl is a radio group', async () => {
    const onChange = vi.fn()
    renderUi(
      <SegmentedControl
        label="Agrupar por"
        value="date"
        onValueChange={onChange}
        options={[
          { value: 'date', label: 'Data' },
          { value: 'discipline', label: 'Disciplina' },
        ]}
      />,
    )
    expect(screen.getByRole('radiogroup', { name: 'Agrupar por' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Data' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Disciplina' }))
    expect(onChange).toHaveBeenCalledWith('discipline')
  })

  it('Tabs show counts and switch panels', async () => {
    renderUi(
      <Tabs defaultValue="a">
        <TabsList>
          <Tab value="a">Visão geral</Tab>
          <Tab value="b" count={3}>Similares</Tab>
        </TabsList>
        <TabsContent value="a">Painel A</TabsContent>
        <TabsContent value="b">Painel B</TabsContent>
      </Tabs>,
    )
    expect(screen.getByRole('tab', { name: 'Similares 3' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Similares 3' }))
    expect(screen.getByText('Painel B')).toBeInTheDocument()
  })

  describe('Chip', () => {
    it('removes a filter with a labelled button', async () => {
      const onRemove = vi.fn()
      renderUi(<Chip label="Paisagismo" onRemove={onRemove} />)
      await userEvent.click(screen.getByRole('button', { name: 'Remover filtro: Paisagismo' }))
      expect(onRemove).toHaveBeenCalled()
    })

    it('works as a toggle with aria-pressed', () => {
      renderUi(<Chip label="Casa" selected onClick={() => undefined} />)
      expect(screen.getByRole('button', { name: 'Casa' })).toHaveAttribute('aria-pressed', 'true')
    })
  })

  it('Badge renders text, never colour alone', () => {
    renderUi(<Badge tone="danger">Impacto alto</Badge>)
    expect(screen.getByText('Impacto alto')).toBeInTheDocument()
  })

  it('KeyValueList skips empty values and renders nothing when all are empty', () => {
    const { container, rerender } = renderUi(
      <KeyValueList items={[{ label: 'Quem', value: 'Gabriela' }, { label: 'Prazo', value: null }]} />,
    )
    expect(screen.getByText('Quem')).toBeInTheDocument()
    expect(screen.queryByText('Prazo')).not.toBeInTheDocument()
    rerender(<KeyValueList items={[{ label: 'Prazo', value: '' }]} />)
    expect(container.querySelector('dl')).toBeNull()
  })

  describe('data states', () => {
    it('skeleton announces loading', () => {
      renderUi(<SkeletonRows rows={3} />)
      expect(screen.getByRole('status', { name: 'Carregando…' })).toBeInTheDocument()
    })

    it('empty state shows the title, text and action', () => {
      renderUi(<EmptyState title="Caixa de ingestão em dia" text="Novas reuniões aparecem aqui." action={<Button>Enviar documento</Button>} />)
      expect(screen.getByRole('heading', { name: 'Caixa de ingestão em dia' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Enviar documento' })).toBeInTheDocument()
    })

    it('error state offers "Tentar de novo"', async () => {
      const onRetry = vi.fn()
      renderUi(<ErrorState title="Não foi possível carregar o histórico" onRetry={onRetry} />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
      expect(onRetry).toHaveBeenCalled()
    })
  })

  describe('Toast', () => {
    function Trigger({ onUndo }: { onUndo?: () => void }) {
      const toast = useToast()
      return (
        <>
          <button onClick={() => toast.show({ message: 'Marcado como marco', tone: 'milestone', onUndo })}>marco</button>
          <button onClick={() => toast.show({ message: 'Recusado · não entra no projeto' })}>recusar</button>
        </>
      )
    }

    it('shows one toast at a time with Desfazer', async () => {
      const onUndo = vi.fn()
      renderUi(<Trigger onUndo={onUndo} />)
      await userEvent.click(screen.getByText('marco'))
      expect(screen.getByRole('status')).toHaveTextContent('Marcado como marco')
      await userEvent.click(screen.getByText('recusar'))
      expect(screen.queryByText('Marcado como marco')).not.toBeInTheDocument()
      expect(screen.getByText('Recusado · não entra no projeto')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument()
    })

    it('runs the undo callback once and closes', async () => {
      const onUndo = vi.fn()
      renderUi(<Trigger onUndo={onUndo} />)
      await userEvent.click(screen.getByText('marco'))
      await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
      expect(onUndo).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('Marcado como marco')).not.toBeInTheDocument()
    })

    it('expires after 5 seconds', () => {
      vi.useFakeTimers()
      try {
        renderUi(<Trigger />)
        act(() => {
          screen.getByText('marco').click()
        })
        expect(screen.getByText('Marcado como marco')).toBeInTheDocument()
        act(() => {
          vi.advanceTimersByTime(5000)
        })
        expect(screen.queryByText('Marcado como marco')).not.toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
