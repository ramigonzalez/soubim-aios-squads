/**
 * Promem component gallery (/dev/ui, development builds only).
 * Every library component in every state, on the real tokens. The strings here
 * are fictional demo data, like the prototypes' seed data, not product copy.
 */
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Avatar,
  Badge,
  Banner,
  BottomSheet,
  Button,
  Checkbox,
  Chip,
  ConsensusList,
  Count,
  DateRange,
  Dialog,
  DisciplineList,
  DisciplineMarker,
  DISCIPLINE_ORDER,
  DueBadge,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Icons,
  ImpactIndicator,
  Input,
  ITEM_TYPE_ORDER,
  ItemTypeBadge,
  ItemTypeIcon,
  KeyValueList,
  Kbd,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  MiniStageBar,
  MilestoneStar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl,
  Select,
  SidePanel,
  SkeletonRows,
  SOURCE_ORDER,
  SourceIcon,
  SourceTile,
  StageStrip,
  Tab,
  Tabs,
  TabsContent,
  TabsList,
  Textarea,
  Tooltip,
  useToast,
  Wordmark,
  type DateRangeValue,
} from '../../design-system'

const TODAY = new Date(2026, 2, 3) // 03/03/2026, as in the prototypes

const STAGES = [
  { id: 'ep', name: 'Estudo Preliminar', start: '2026-01-15', end: '2026-02-15' },
  { id: 'ap', name: 'Anteprojeto', start: '2026-02-16', end: '2026-03-31' },
  { id: 'pl', name: 'Projeto Legal', start: '2026-04-01', end: '2026-05-15' },
  { id: 'pe', name: 'Projeto Executivo', start: '2026-05-16', end: '2026-08-31' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <h2 className="text-h2 text-ink">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <span className="w-40 shrink-0 text-label uppercase text-ink-2">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default function UiGallery() {
  const toast = useToast()
  const { t } = useTranslation('labels')
  const [group, setGroup] = useState<'date' | 'discipline'>('date')
  const [checked, setChecked] = useState(true)
  const [star, setStar] = useState(true)
  const [done, setDone] = useState(false)
  const [range, setRange] = useState<DateRangeValue>({ from: '2026-01-15', to: '2026-08-31' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [discFilter, setDiscFilter] = useState<string[]>(['landscape'])
  const [select, setSelect] = useState('structural')

  return (
    <div className="min-h-screen bg-bg">
      <main className="mx-auto flex max-w-content flex-col gap-8 px-4 pb-20 pt-8 md:px-10">
        <header className="flex flex-col gap-1">
          <span className="text-label uppercase text-ink-2">Design system</span>
          <h1 className="text-h1 text-ink">Promem · componentes</h1>
          <p className="text-small text-ink-2">Tokens, primitives e componentes de domínio em todos os estados.</p>
        </header>

        <Section title="Tipografia">
          <p className="text-display text-ink">display 48</p>
          <p className="text-h1 text-ink">h1 · Residential Tower Alpha</p>
          <p className="text-h2 text-ink">h2 · Preservar as árvores existentes</p>
          <p className="text-h3 text-ink">h3 · 6 de fevereiro</p>
          <p className="text-body text-ink">body · Linha de item com título em 14/500</p>
          <p className="text-small text-ink-2">small · Revisão do projeto estrutural · Carlos</p>
          <p className="text-caption text-ink-2">caption · Reunião · 45 min · Gabriela, Carlos, Lucia</p>
          <p className="text-micro text-ink-2">micro · Escritório Exemplo</p>
          <p className="text-label uppercase text-ink-2">label · Por quê</p>
          <p className="font-serif text-reading text-ink-soft">reading · A equipe decidiu manter as árvores do lote e compensar a área permeável com cobertura verde no pódio.</p>
          <p className="font-mono text-mono text-ink-2">mono · 06/02/2026 · 00:08:30</p>
          <p className="text-kpi text-ink">kpi 21</p>
        </Section>

        <Section title="Marca">
          <Row label="Wordmark">
            <Wordmark size={19} />
            <Wordmark size={22} endorsed />
            <Wordmark size={13} />
            <span className="rounded-md bg-ink p-3">
              <Wordmark size={22} tone="white" />
            </span>
          </Row>
        </Section>

        <Section title="Disciplinas">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {DISCIPLINE_ORDER.map((d) => (
              <div key={d} className="flex items-center gap-4">
                <DisciplineMarker discipline={d} />
                <DisciplineMarker discipline={d} size="md" label="name" />
              </div>
            ))}
          </div>
          <Row label="Lista">
            <DisciplineList disciplines={['landscape', 'structural']} />
            <DisciplineList disciplines={['architecture', 'structural', 'mep', 'fire_protection']} />
          </Row>
        </Section>

        <Section title="Tipos e fontes">
          <Row label="Ícones">
            {ITEM_TYPE_ORDER.map((type) => (
              <ItemTypeIcon key={type} type={type} />
            ))}
            <ItemTypeIcon type="action_item" done={done} onToggleDone={() => setDone((v) => !v)} />
          </Row>
          <Row label="Badges">
            {ITEM_TYPE_ORDER.map((type) => (
              <ItemTypeBadge key={type} type={type} />
            ))}
          </Row>
          <Row label="Fontes">
            {SOURCE_ORDER.map((s) => (
              <SourceIcon key={s} type={s} />
            ))}
            {SOURCE_ORDER.map((s) => (
              <SourceTile key={s} type={s} />
            ))}
          </Row>
        </Section>

        <Section title="Botões">
          <Row label="Variantes">
            <Button variant="primary" icon={<Icons.link />}>Compartilhar marcos</Button>
            <Button icon={<Icons.upload />}>Enviar documento</Button>
            <Button variant="ghost">Expandir tudo</Button>
            <Button variant="link">Ver no histórico →</Button>
            <Button variant="danger-ghost">Revogar link</Button>
          </Row>
          <Row label="Atalhos">
            <Button icon={<Icons.close />} shortcut="R">Recusar</Button>
            <Button variant="primary" icon={<Icons.check />} shortcut="A">Aprovar</Button>
          </Row>
          <Row label="Tamanhos">
            <Button size="sm">Pequeno</Button>
            <Button size="md">Médio</Button>
            <Button size="lg" variant="primary">Agendar demonstração</Button>
          </Row>
          <Row label="Estados">
            <Button disabled>Desabilitado</Button>
            <Button variant="primary" loading>Salvando</Button>
          </Row>
          <Row label="Ícone">
            <IconButton label="Mais ações" icon={<Icons.more />} />
            <IconButton label="Fechar" icon={<Icons.close />} size="sm" variant="ghost" />
            <IconButton label="Buscar" icon={<Icons.search />} size="touch" variant="ghost" />
          </Row>
        </Section>

        <Section title="Campos">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome do projeto">
              <Input placeholder="ex.: Residencial Vila Madalena" />
            </Field>
            <Field label="Descrição" optional help="Aparece abaixo do nome em todas as páginas do projeto.">
              <Input placeholder="ex.: Torre residencial de 50 pavimentos" />
            </Field>
            <Field label="Pasta do Drive" error="Não encontramos essa pasta. Verifique se ela foi compartilhada com o Promem.">
              <Input defaultValue="Projetos / Tower Alpha" />
            </Field>
            <Field label="Fim" warning="As datas de Anteprojeto e Projeto Legal se sobrepõem.">
              <Input type="date" defaultValue="2026-04-05" />
            </Field>
            <Field label="Disciplina">
              <Select
                value={select}
                onValueChange={setSelect}
                options={DISCIPLINE_ORDER.slice(0, 6).map((d) => ({
                  value: d,
                  label: t(`discipline.${d}`),
                  marker: <DisciplineMarker discipline={d} size="md" label="none" />,
                }))}
              />
            </Field>
            <Field label="Observações" optional>
              <Textarea placeholder="ex.: Confirmar com o cliente na próxima reunião" />
            </Field>
            <Field label="Desabilitado">
              <Input disabled defaultValue="Somente leitura" />
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-small font-semibold text-ink">Barra de ferramentas</span>
              <Input size="toolbar" leadingIcon={<Icons.search />} placeholder="Buscar em 21 itens…" trailing={<Kbd boxed>/</Kbd>} />
              <DateRange value={range} onChange={setRange} className="self-start" />
            </div>
          </div>
        </Section>

        <Section title="Seleção">
          <Row label="Checkbox">
            <Checkbox checked={checked} onCheckedChange={setChecked} label="Só com pendências" />
            <Checkbox checked="indeterminate" aria-label="Selecionar todos" />
            <Checkbox checked={false} aria-label="Selecionar" />
            <Checkbox disabled checked aria-label="Desabilitado" />
          </Row>
          <Row label="Segmentado">
            <SegmentedControl
              label="Agrupar por"
              value={group}
              onValueChange={setGroup}
              options={[
                { value: 'date', label: 'Data' },
                { value: 'discipline', label: 'Disciplina' },
              ]}
            />
          </Row>
          <Row label="Chips">
            <Chip label="Paisagismo" marker={<DisciplineMarker discipline="landscape" size="md" label="none" />} onRemove={() => undefined} />
            <Chip label="Decisão" marker={<ItemTypeIcon type="decision" size={12} />} onRemove={() => undefined} />
            <Chip label="Incêndio" touch onRemove={() => undefined} />
            <Chip label="Edificação padrão" onClick={() => undefined} />
            <Chip label="Casa" selected onClick={() => undefined} />
          </Row>
        </Section>

        <Section title="Badges e indicadores">
          <Row label="Prazo">
            <DueBadge due="2026-03-13" today={TODAY} />
            <DueBadge due="2026-02-10" today={TODAY} />
            <DueBadge due="2026-02-13" done today={TODAY} />
          </Row>
          <Row label="Status">
            <Badge tone="danger">Impacto alto</Badge>
            <Badge tone="success" icon={<Icons.check />}>Aprovado</Badge>
            <Badge tone="muted" icon={<Icons.close />}>Recusado</Badge>
            <Badge tone="success">Confiança alta</Badge>
            <Badge tone="warning">Confiança média</Badge>
            <Badge tone="accent">Editado</Badge>
            <Count>21</Count>
          </Row>
          <Row label="Impacto">
            <ImpactIndicator level="high" />
            <ImpactIndicator level="medium" />
            <ImpactIndicator level="low" />
          </Row>
          <Row label="Marco">
            <span className="group inline-flex items-center gap-4 rounded-md px-2 py-1 hover:bg-surface-2">
              <MilestoneStar pressed={star} onToggle={() => setStar((v) => !v)} />
              <MilestoneStar pressed={false} onToggle={() => undefined} />
              <MilestoneStar pressed />
              <MilestoneStar pressed={star} onToggle={() => setStar((v) => !v)} size="panel" />
            </span>
          </Row>
          <Row label="Avatar">
            <Avatar name="Gabriela" />
            <Avatar name="Carlos" size={22} />
            <Avatar name="Lucia" size={32} />
          </Row>
        </Section>

        <Section title="Consenso e detalhes">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ConsensusList
              rows={[
                { discipline: 'landscape', status: 'AGREE' },
                { discipline: 'structural', status: 'MIXED', notes: 'Rever carga da cobertura verde.' },
                { discipline: 'client', status: 'DISAGREE' },
                { discipline: 'mep', status: 'ABSTAIN' },
              ]}
            />
            <ConsensusList
              rows={[
                { discipline: 'landscape', status: 'AGREE' },
                { discipline: 'structural', status: 'AGREE' },
                { discipline: 'architecture', status: 'AGREE' },
              ]}
            />
            <KeyValueList
              items={[
                { label: 'Quem', value: 'Gabriela · Diretora de projeto' },
                { label: 'Origem', value: 'Revisão de paisagismo · 06/02/2026' },
                { label: 'Etapa', value: 'Estudo Preliminar' },
                { label: 'Prazo', value: null },
              ]}
            />
            <KeyValueList
              variant="wide"
              boxed
              items={[
                { label: 'Participantes', value: 'Gabriela, Carlos, Ana (cliente)' },
                { label: 'Recebido', value: '02/03 às 14:00' },
              ]}
            />
          </div>
        </Section>

        <Section title="Etapas">
          <StageStrip stages={STAGES} today={TODAY} />
          <StageStrip stages={STAGES} today={TODAY} barSize="lg" />
          <div className="w-60">
            <MiniStageBar stages={STAGES} today={TODAY} />
          </div>
        </Section>

        <Section title="Avisos">
          <Banner>2 participantes externos (cliente). Os itens ficam visíveis só para a equipe.</Banner>
          <Banner tone="warning">Possível duplicata de “Reunião semanal · 27/02”.</Banner>
          <Banner tone="danger" action={<Button size="sm">Atualizar pagamento</Button>}>
            O pagamento do escritório está pendente.
          </Banner>
          <Row label="Toast">
            <Button onClick={() => toast.show({ message: 'Aprovado · a IA está extraindo os itens', tone: 'success', onUndo: () => undefined })}>
              Sucesso + desfazer
            </Button>
            <Button onClick={() => toast.show({ message: 'Marcado como marco', tone: 'milestone', onUndo: () => undefined })}>Marco</Button>
            <Button onClick={() => toast.show({ message: 'Não foi possível enviar o documento', tone: 'error', onRetry: () => undefined })}>Erro</Button>
          </Row>
        </Section>

        <Section title="Estados de dados">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-line">
              <SkeletonRows rows={5} />
            </div>
            <div className="rounded-lg border border-line">
              <EmptyState
                icon={<Icons.ingestion />}
                title="Caixa de ingestão em dia"
                text="Novas reuniões, e-mails e documentos aparecem aqui assim que chegarem."
              />
            </div>
            <div className="rounded-lg border border-line">
              <ErrorState
                title="Não foi possível carregar o histórico"
                text="A conexão caiu no meio do caminho. Nada foi perdido."
                onRetry={() => undefined}
              />
            </div>
          </div>
        </Section>

        <Section title="Sobreposições">
          <Row label="Abrir">
            <Popover>
              <PopoverTrigger asChild>
                <Button icon={<Icons.dropdown />}>Disciplina</Button>
              </PopoverTrigger>
              <PopoverContent className="w-60">
                {DISCIPLINE_ORDER.slice(0, 5).map((d) => (
                  <label key={d} className="flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 hover:bg-surface-2">
                    <Checkbox
                      checked={discFilter.includes(d)}
                      onCheckedChange={(v) => setDiscFilter((cur) => (v ? [...cur, d] : cur.filter((x) => x !== d)))}
                      aria-label={t(`discipline.${d}`)}
                    />
                    <DisciplineMarker discipline={d} size="md" label="name" />
                  </label>
                ))}
              </PopoverContent>
            </Popover>
            <Menu>
              <MenuTrigger asChild>
                <IconButton label="Mais ações" icon={<Icons.more />} />
              </MenuTrigger>
              <MenuContent>
                <MenuLabel>Projeto</MenuLabel>
                <MenuItem icon={<Icons.manual />}>Editar projeto</MenuItem>
                <MenuCheckboxItem checked>Mostrar etapas sem marcos</MenuCheckboxItem>
                <MenuSeparator />
                <MenuItem destructive icon={<Icons.remove />}>Arquivar</MenuItem>
              </MenuContent>
            </Menu>
            <Tooltip content="Arquitetura, Estrutura, Instalações">
              <Button variant="ghost">Tooltip</Button>
            </Tooltip>
            <Button onClick={() => setDialogOpen(true)}>Dialog</Button>
            <Button onClick={() => setPanelOpen(true)}>SidePanel</Button>
            <Button onClick={() => setSheetOpen(true)}>BottomSheet</Button>
          </Row>
          <Tabs defaultValue="overview">
            <TabsList>
              <Tab value="overview">Visão geral</Tab>
              <Tab value="excerpt">Trecho da fonte</Tab>
              <Tab value="similar" count={3}>
                Similares
              </Tab>
            </TabsList>
            <TabsContent value="overview" className="pt-4 text-small text-ink-2">Conteúdo da aba Visão geral.</TabsContent>
            <TabsContent value="excerpt" className="pt-4 text-small text-ink-2">Conteúdo da aba Trecho da fonte.</TabsContent>
            <TabsContent value="similar" className="pt-4 text-small text-ink-2">Conteúdo da aba Similares.</TabsContent>
          </Tabs>
        </Section>
      </main>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Compartilhar marcos"
        description="Link somente leitura para clientes e fornecedores. Ninguém precisa de login."
        footer={
          <>
            <Button variant="danger-ghost" className="mr-auto">Revogar link</Button>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button variant="primary">Copiar link</Button>
          </>
        }
      >
        <div className="py-2">
          <Input readOnly leadingIcon={<Icons.link />} value="promem.com.br/m/rta-7k2p" className="font-mono" />
        </div>
      </Dialog>

      <SidePanel open={panelOpen} onOpenChange={setPanelOpen} title="Detalhe do item">
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
          <span className="flex items-center gap-2">
            <ItemTypeBadge type="decision" />
            <Badge tone="danger">Impacto alto</Badge>
          </span>
          <span className="flex items-center gap-1">
            <MilestoneStar pressed={star} onToggle={() => setStar((v) => !v)} size="panel" />
            <IconButton label="Item anterior" icon={<Icons.previous />} size="sm" variant="ghost" />
            <IconButton label="Próximo item" icon={<Icons.next />} size="sm" variant="ghost" />
            <IconButton label="Fechar painel" icon={<Icons.close />} size="sm" variant="ghost" onClick={() => setPanelOpen(false)} />
          </span>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <h2 className="text-h2 text-ink">Preservar as árvores existentes e instalar cobertura verde no pódio</h2>
          <DisciplineList disciplines={['landscape', 'structural']} />
        </div>
      </SidePanel>

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Filtros"
        action={<Button variant="ghost" size="sm">Limpar</Button>}
        footer={
          <Button variant="primary" size="lg" className="w-full" onClick={() => setSheetOpen(false)}>
            Ver 12 itens
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2 pt-2">
          {DISCIPLINE_ORDER.slice(0, 8).map((d) => (
            <Chip key={d} touch label={t(`disciplineShort.${d}`)} marker={<DisciplineMarker discipline={d} size="md" label="none" />} onClick={() => undefined} />
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
