/**
 * Product visuals (LANDING_COPY §1 and §4), built with the app's design-system
 * components and static demo data. Demo names are fictional, as in the prototypes.
 */
import type { ReactNode } from 'react'
import {
  Button,
  ConsensusList,
  DisciplineMarker,
  Icons,
  ImpactIndicator,
  Input,
  ItemTypeBadge,
  ItemTypeIcon,
  SourceBand,
  SourceIcon,
  SourceTile,
  StageStrip,
  StageTimeline,
  TranscriptTurn,
  TurnItemChip,
  cn,
  type TimelineMilestone,
  type TimelineStage,
} from '../src/design-system'
import type { StageInput } from '../src/lib/stages'
import type { Discipline, ItemType, SourceType } from '../src/types/projectItem'
import { ProductVisual } from './ui'

const noop = () => {}

/** The demo project's "today" (03/03/2026). Fixed so the build is reproducible. */
const DEMO_TODAY = new Date(2026, 2, 3)

const DEMO_STAGES: StageInput[] = [
  { id: 'ep', name: 'Estudo Preliminar', start: '2026-01-15', end: '2026-02-15' },
  { id: 'ap', name: 'Anteprojeto', start: '2026-02-16', end: '2026-03-31' },
  { id: 'pl', name: 'Projeto Legal', start: '2026-04-01', end: '2026-05-15' },
  { id: 'ex', name: 'Executivo', start: '2026-05-16', end: '2026-08-31' },
]

function milestone(id: string, title: string, discipline: Discipline, at: Date): TimelineMilestone {
  return {
    id,
    icon: <ItemTypeIcon type="decision" size={14} />,
    title,
    disciplines: <DisciplineMarker discipline={discipline} />,
    date: null,
    at,
  }
}

const HERO_TIMELINE: TimelineStage[] = [
  {
    id: 'ep',
    name: 'Estudo Preliminar',
    dates: '15/01 – 15/02',
    state: 'done',
    milestones: [
      milestone('c50', 'Concreto C50 nos pilares principais', 'structural', new Date(2026, 0, 28)),
      milestone('vigas', 'Vigas de transição no nível 5', 'structural', new Date(2026, 1, 6)),
      milestone('clima', 'Climatização central por zona', 'mep', new Date(2026, 1, 12)),
    ],
  },
  {
    id: 'ap',
    name: 'Anteprojeto',
    dates: '16/02 – 31/03',
    state: 'current',
    milestones: [milestone('shaft', 'Shaft de prumadas ampliado em 20 cm', 'mep', new Date(2026, 1, 24))],
  },
  { id: 'pl', name: 'Projeto Legal', dates: '01/04 – 15/05', state: 'future', milestones: [], emptyLabel: 'Sem marcos ainda' },
]

/** Hero: "Linha do tempo de marcos" card + the floating decision card. */
export function HeroVisual() {
  const Play = Icons.play
  return (
    <ProductVisual label="Exemplo do Promem: linha do tempo de marcos do projeto Residential Tower Alpha e o detalhe de uma decisão.">
      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-2">
        <div className="flex flex-col gap-3 border-b border-line-soft px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-h3 text-ink">Residential Tower Alpha</span>
            <span className="font-mono text-mono-sm text-ink-2">Linha do tempo de marcos</span>
          </div>
          <StageStrip stages={DEMO_STAGES} today={DEMO_TODAY} compact />
        </div>
        <div className="px-3 pt-5 sm:px-5">
          <StageTimeline stages={HERO_TIMELINE} today={DEMO_TODAY} todayLabel="Hoje · 03/03" />
        </div>
      </div>
      <div className="relative z-10 -mt-3 ml-auto flex w-full max-w-xs flex-col gap-2 rounded-lg bg-surface p-4 shadow-2 sm:-mr-2">
        <div className="flex flex-wrap items-center gap-3">
          <ItemTypeBadge type="decision" />
          <ImpactIndicator level="high" />
        </div>
        <p className="text-body font-semibold text-ink">Vigas de transição no nível 5 para liberar o pódio comercial</p>
        <p className="font-serif text-body text-ink-soft">“A grelha atual não funciona para as vitrines. As vigas liberam o pódio por completo.”</p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <SourceIcon type="meeting" />
            Carlos · Reunião de 06/02
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-mono font-medium text-accent">
            <Play className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            00:22:10
          </span>
        </div>
      </div>
    </ProductVisual>
  )
}

/** Paper frame + white card used by every Recursos visual. */
function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ProductVisual label={label} className="rounded-lg bg-bg p-4 sm:p-6">
      {children}
    </ProductVisual>
  )
}

/** 01 · Linha do tempo de marcos: the share card. */
export function ShareVisual() {
  const Copy = Icons.copy
  return (
    <Frame label="Exemplo: compartilhar a linha do tempo de marcos com o cliente por um link somente leitura.">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-body font-semibold text-ink">Compartilhar marcos</span>
          <span className="text-caption text-ink-2">somente leitura</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input readOnly value="promem.com.br/m/rta-7k2p" aria-label="Link" className="min-w-0 flex-1 basis-40 font-mono text-mono" />
          <Button variant="primary" icon={<Copy strokeWidth={1.75} aria-hidden />}>
            Copiar link
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-2">
          <span>Expira em 30 dias</span>
          <span>Visualizado 4 vezes</span>
          <Button variant="danger-ghost" size="sm" className="ml-auto px-2">
            Revogar
          </Button>
        </div>
      </div>
    </Frame>
  )
}

const HISTORY_ROWS: { type: ItemType; title: string; discipline: Discipline; done?: boolean }[] = [
  { type: 'decision', title: 'Concreto de alta resistência (C50) nos pilares principais', discipline: 'structural' },
  { type: 'decision', title: 'Isoladores sísmicos nos pilares do térreo', discipline: 'civil' },
  { type: 'action_item', title: 'Enviar tabela de cargas revisada até sexta', discipline: 'structural', done: true },
  { type: 'topic', title: 'Pé-direito do pódio precisa ficar acima de 4 m', discipline: 'architecture' },
]

/** 02 · Histórico do projeto: a source band with its items. */
export function HistoryVisual() {
  return (
    <Frame label="Exemplo: itens extraídos da reunião Revisão do projeto estrutural, com tipo e disciplina.">
      <SourceBand
        tile={<SourceTile type="meeting" />}
        kind="Reunião"
        title="Revisão do projeto estrutural"
        meta="06/02 · 4 decisões · 1 ação · 1 tópico"
        expanded
        onToggle={noop}
        toggleLabel="Recolher"
      >
        <ul>
          {HISTORY_ROWS.map((row) => (
            <li key={row.title} className="flex items-start gap-2.5 border-b border-line-soft px-3 py-2.5 last:border-b-0">
              <span className="flex pt-0.5">
                <ItemTypeIcon type={row.type} done={row.done} />
              </span>
              <span className={cn('min-w-0 flex-1 text-body font-medium', row.done ? 'text-ink-3 line-through' : 'text-ink')}>{row.title}</span>
              <DisciplineMarker discipline={row.discipline} className="pt-0.5" />
            </li>
          ))}
        </ul>
      </SourceBand>
    </Frame>
  )
}

/** 03 · Detalhe da decisão: title, "Por quê" and the consensus. */
export function DecisionVisual() {
  return (
    <Frame label="Exemplo: detalhe de uma decisão com a justificativa e o consenso de três disciplinas.">
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5">
        <p className="text-h3 text-ink">Preservar as árvores existentes e instalar cobertura verde no pódio</p>
        <div className="flex flex-col gap-1">
          <p className="text-label uppercase text-ink-2">Por quê</p>
          <p className="font-serif text-reading text-ink">Benefícios ambientais, exigência da comunidade e créditos LEED de águas pluviais.</p>
        </div>
        <ConsensusList
          rows={[
            { discipline: 'landscape', status: 'AGREE' },
            { discipline: 'structural', status: 'AGREE' },
            { discipline: 'client', status: 'AGREE' },
          ]}
        />
      </div>
    </Frame>
  )
}

/** 04 · Reunião com transcrição: three turns, the first anchored to a decision. */
export function TranscriptVisual() {
  return (
    <Frame label="Exemplo: trecho de transcrição com uma decisão ancorada e um aviso de vozes sobrepostas.">
      <ol className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-2">
        <TranscriptTurn
          time="05:32"
          speaker="Carlos"
          text="Minha recomendação é concreto C50 nos pilares principais. Ganhamos área útil em todos os pavimentos."
          focused
          chips={<TurnItemChip icon={<ItemTypeIcon type="decision" size={12} />} label="Concreto C50 nos pilares principais" onClick={noop} />}
        />
        <TranscriptTurn time="06:10" speaker="Lucia" text="Pilares menores ajudam muito nas plantas residenciais." />
        <TranscriptTurn
          time="22:45"
          speaker="Gabriela ou Lucia"
          uncertain
          reason="vozes sobrepostas"
          text="Funciona, desde que o pé-direito do pódio fique acima de quatro metros."
        />
      </ol>
    </Frame>
  )
}

const INBOX_ROWS: { type: SourceType; title: string; meta: string }[] = [
  { type: 'meeting', title: 'Revisão de andamento com o cliente · Fase 2', meta: 'Reunião · Fireflies · → Residential Tower Alpha' },
  { type: 'email', title: 'RE: Projeto de irrigação revisado', meta: 'E-mail · Marina (Paisagismo) · → Residential Tower Alpha' },
  { type: 'document', title: 'Structural-Peer-Review.pdf', meta: 'Documento · Google Drive · → Residential Tower Alpha' },
]

/** 05 · Aprovação de ingestão: inbox rows with Recusar / Aprovar. */
export function InboxVisual() {
  return (
    <Frame label="Exemplo: caixa de ingestão com uma reunião, um e-mail e um documento aguardando aprovação.">
      <ul className="overflow-hidden rounded-lg border border-line bg-surface">
        {INBOX_ROWS.map((row, index) => (
          <li
            key={row.title}
            className={cn(
              'flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft px-3.5 py-3 last:border-b-0',
              index === 0 ? 'bg-accent-weak shadow-rail' : 'bg-surface',
            )}
          >
            <SourceTile type={row.type} />
            <span className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
              <span className="text-body font-semibold text-ink">{row.title}</span>
              <span className="text-caption text-ink-2">{row.meta}</span>
            </span>
            <span className="ml-auto flex gap-1.5">
              <Button size="sm">Recusar</Button>
              <Button size="sm" variant="primary">
                Aprovar
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}
