/**
 * Promem landing page (docs/design_handoff_promem/README.md §10).
 * Copy: LANDING_COPY.md, verbatim. Text in [brackets] renders as <Placeholder>.
 * Rendered to static HTML at build time (render.tsx); no React in the browser.
 */
import type { ReactNode } from 'react'
import { Icons, Wordmark, cn } from '../src/design-system'
import { ContactForm } from './ContactForm'
import { CONTAINER, CtaLink, Eyebrow, Placeholder, SECTION_Y, SectionHeading } from './ui'
import { DecisionVisual, HeroVisual, HistoryVisual, InboxVisual, ShareVisual, TranscriptVisual } from './visuals'

const NAV = [
  { href: '#dores', label: 'Por que' },
  { href: '#como', label: 'Como funciona' },
  { href: '#recursos', label: 'Recursos' },
  { href: '#seguranca', label: 'Segurança' },
  { href: '#perguntas', label: 'Perguntas' },
]

function Header() {
  return (
    <header className="landing-header sticky top-0 z-20 border-b border-line backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-landing items-center gap-4 px-4 sm:px-6 lg:gap-7">
        <a href="#topo" className="flex shrink-0 rounded-sm text-ink">
          <Wordmark size={22} endorsed />
        </a>
        <nav aria-label="Principal" className="hidden min-w-0 flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-6">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="whitespace-nowrap rounded-sm text-body text-ink-soft no-underline hover:text-ink">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <CtaLink mode="demo" variant="primary" className="ml-auto lg:ml-0">
          Agendar demonstração
        </CtaLink>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section id="topo" aria-labelledby="topo-titulo" className={cn(CONTAINER, 'grid scroll-mt-16 gap-12 pb-12 pt-16 lg:grid-cols-2 lg:items-center lg:pt-20')}>
      <div className="flex min-w-0 flex-col gap-6">
        <Eyebrow>Memória de projeto para arquitetura e construção</Eyebrow>
        <h1 id="topo-titulo" className="text-balance text-hero text-ink">
          Toda decisão do projeto registrada, sem ninguém precisar escrever ata.
        </h1>
        <p className="max-w-xl text-pretty font-serif text-reading-lg text-ink-soft">
          O Promem captura as reuniões, os e-mails e os documentos do projeto e organiza decisões, ações e tópicos por disciplina e etapa, com quem
          decidiu, quando e por quê.
        </p>
        <div className="flex flex-wrap gap-3">
          <CtaLink mode="demo" variant="primary" size="lg" className="h-12 px-6 text-h3">
            Agendar demonstração
          </CtaLink>
          <CtaLink mode="pilot" variant="secondary" size="lg" className="h-12 border-ink px-6 text-h3">
            Solicitar piloto gratuito
          </CtaLink>
        </div>
        <p className="text-small text-ink-2">Feito dentro da souBIM, um escritório de BIM em atividade, e usado nos projetos reais dele.</p>
      </div>
      <HeroVisual />
    </section>
  )
}

const INTEGRATIONS = ['Tactiq', 'Fireflies', 'Fathom', 'Gmail', 'Google Drive']

function Integrations() {
  return (
    <section aria-label="Integrações" className="border-y border-line bg-surface">
      <div className={cn(CONTAINER, 'flex flex-wrap items-center gap-x-7 gap-y-3 py-5 text-small text-ink-2')}>
        <p className="font-semibold text-ink">Conecta com o que sua equipe já usa:</p>
        {/* Names as text. Logos only with trademark permission. */}
        <ul className="flex flex-wrap gap-x-7 gap-y-2">
          {INTEGRATIONS.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <Placeholder className="lg:ml-auto">[Espaço para logos de clientes, com autorização]</Placeholder>
      </div>
    </section>
  )
}

const PAINS = [
  {
    quote: 'Alguém fez a ata da reunião?',
    cost: 'Ninguém fez. Ou fez, mas sem o que importava, e cada um lembra de um jeito.',
    fix: 'A ata se escreve sozinha.',
    how: 'O Promem lê a gravação da reunião e extrai decisões, ações com responsável e prazo, tópicos em aberto, ideias e informações. Sem ninguém digitar.',
  },
  {
    quote: 'Quem aprovou isso?',
    cost: 'Quando a dúvida aparece na obra, a resposta está na memória de alguém. Ou em lugar nenhum.',
    fix: 'Cada decisão tem autor, data, motivo e prova.',
    how: 'Quem decidiu, quando, por quê, quais disciplinas concordaram e o trecho exato da gravação, a um clique.',
  },
  {
    quote: 'Isso foi combinado no e-mail, na reunião ou no WhatsApp?',
    cost: 'A informação do projeto está espalhada em cinco lugares, e nenhum deles é o projeto.',
    fix: 'Reuniões, e-mails e documentos num lugar só.',
    how: 'O gravador de reuniões, o Gmail e o Google Drive alimentam uma linha do tempo única por projeto, organizada por etapa e por disciplina.',
  },
  {
    quote: 'A estrutura não sabia que a arquitetura tinha mudado.',
    cost: 'Retrabalho de projeto, compatibilização refeita, prazo perdido.',
    fix: 'Cada disciplina vê o que a afeta.',
    how: 'Todo item é marcado com as disciplinas envolvidas e seus impactos. Filtre por Estrutura, Instalações ou Elétrica e veja só o que importa para cada uma.',
  },
  {
    quote: 'Preciso perguntar para a diretora antes de seguir.',
    cost: 'Uma pessoa vira gargalo de todas as decisões, em todos os projetos.',
    fix: 'A equipe decide com contexto, e a diretora acompanha em minutos.',
    how: 'A visão geral mostra o que mudou desde a última visita, o que está em aberto e o que está atrasado. Dá para entender cada projeto em menos de um minuto.',
  },
  {
    quote: 'O cliente diz que nunca aprovou isso.',
    cost: 'Discussão com cliente e construtora, aditivo, desgaste na relação.',
    fix: 'Um registro que o cliente também vê.',
    how: 'Compartilhe a linha do tempo de marcos por link, sem login, ou em PDF. Cada marco mostra a data, as disciplinas e o motivo.',
  },
  {
    quote: 'O arquiteto novo vai levar semanas para entender o projeto.',
    cost: 'Integração lenta, perguntas repetidas e decisões refeitas por falta de contexto.',
    fix: 'O histórico do projeto ensina quem chega.',
    how: 'Quem entra no projeto lê a história completa: o que foi decidido, em que etapa, por quem e por quê.',
  },
  {
    quote: 'Não quero que a IA leia tudo do escritório.',
    cost: 'Medo de expor conversas internas, dados de clientes e informações confidenciais.',
    fix: 'Você aprova o que entra, item por item.',
    how: 'Toda reunião, e-mail ou documento passa pela caixa de ingestão. Só o que você aprovar é processado e entra no projeto.',
  },
]

const pad = (n: number) => String(n).padStart(2, '0')

function Pains() {
  return (
    <section id="dores" aria-labelledby="dores-titulo" className={cn(CONTAINER, SECTION_Y, 'flex flex-col gap-10')}>
      <SectionHeading
        id="dores-titulo"
        eyebrow="O problema"
        title="As decisões do projeto se perdem entre reuniões, e-mails e documentos."
        intro="Você já ouviu todas estas frases no escritório. Cada uma custa retrabalho, prazo e, às vezes, uma discussão com o cliente."
      />
      <ol className="flex flex-col border-t border-ink">
        {PAINS.map((pain, index) => (
          <li key={pain.quote} className="flex flex-col gap-4 border-b border-line py-6 md:flex-row md:gap-8 lg:py-7">
            <div className="flex min-w-0 gap-4 md:flex-1">
              <span aria-hidden className="pt-1.5 font-mono text-mono text-ink-2">
                {pad(index + 1)}
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-pretty font-serif text-h2 font-normal italic tracking-normal text-ink md:text-h1 md:font-normal md:tracking-normal">
                  “{pain.quote}”
                </p>
                <p className="text-pretty text-body text-ink-2">{pain.cost}</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 pl-9 md:flex-[1.2] md:pl-0">
              <p className="font-mono text-mono-sm uppercase tracking-widest text-accent">Com o Promem</p>
              <p className="text-pretty text-h2 text-ink">{pain.fix}</p>
              <p className="text-pretty text-h3 font-normal leading-relaxed text-ink-soft">{pain.how}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-lg bg-ink px-6 py-6 sm:px-7">
        <p className="min-w-0 flex-1 basis-80 text-pretty text-h2 text-on-dark">Reconheceu alguma? Mostramos com um projeto parecido com o seu, em 30 minutos.</p>
        <CtaLink mode="demo" variant="secondary" size="lg" className="border-transparent">
          Agendar demonstração
        </CtaLink>
      </div>
    </section>
  )
}

const STEPS = [
  {
    title: 'Conecte',
    text: 'Ligue o gravador de reuniões que a equipe já usa (Tactiq, Fireflies ou Fathom), o Gmail e a pasta do projeto no Google Drive.',
    foot: 'Configuração guiada pela nossa equipe',
  },
  {
    title: 'Você aprova, a IA organiza',
    text: 'O que chega passa pela sua aprovação. A IA extrai decisões, ações, tópicos, ideias e informações, com disciplina, autor e data.',
    foot: 'Nada é processado sem o seu ok',
  },
  {
    title: 'Decida com contexto',
    text: 'Abra o projeto e veja onde ele está, o que mudou e o que precisa de alguém. Compartilhe os marcos com o cliente.',
    foot: 'Também no celular',
  },
]

function HowItWorks() {
  return (
    <section id="como" aria-labelledby="como-titulo" className={cn(CONTAINER, SECTION_Y, 'flex flex-col gap-9')}>
      <SectionHeading id="como-titulo" eyebrow="Como funciona" title="Nada muda na rotina da equipe." />
      <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-3 bg-surface p-6 lg:p-7">
            <span className="font-mono text-mono text-accent">{pad(index + 1)}</span>
            <h3 className="text-h1 font-bold text-ink">{step.title}</h3>
            <p className="text-pretty text-h3 font-normal leading-relaxed text-ink-soft">{step.text}</p>
            <p className="mt-auto pt-2 text-small text-ink-2">{step.foot}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Feature({ index, kicker, title, children, visual, reverse }: { index: number; kicker: string; title: ReactNode; children: ReactNode; visual: ReactNode; reverse?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-8 lg:items-center lg:gap-12', reverse ? 'lg:flex-row-reverse' : 'lg:flex-row')}>
      <div className="flex min-w-0 flex-col gap-3 lg:flex-1">
        <p className="font-mono text-mono text-ink-2">
          {pad(index)} · {kicker}
        </p>
        <h3 className="text-balance text-h1 font-bold text-ink">{title}</h3>
        <p className="text-pretty text-h3 font-normal leading-relaxed text-ink-soft">{children}</p>
      </div>
      <div className="min-w-0 lg:flex-[1.35]">{visual}</div>
    </div>
  )
}

function Features() {
  return (
    <section id="recursos" aria-labelledby="recursos-titulo" className="scroll-mt-16 border-y border-line bg-surface">
      <div className={cn(CONTAINER, 'flex flex-col gap-16 py-20 lg:gap-20 lg:py-24')}>
        <SectionHeading id="recursos-titulo" eyebrow="Recursos" title="O projeto inteiro, num lugar que todo mundo entende." />
        <Feature index={1} kicker="Linha do tempo de marcos" title="Onde o projeto está, em um minuto." visual={<ShareVisual />}>
          Os marcos aparecem ao longo das etapas (Estudo Preliminar, Anteprojeto, Projeto Legal, Executivo), com o “hoje” no lugar certo. Compartilhe
          com o cliente por link, sem login, ou exporte em PDF.
        </Feature>
        <Feature index={2} kicker="Histórico do projeto" title="“O que decidimos mesmo?” Tem resposta." visual={<HistoryVisual />} reverse>
          Cada item fica organizado por data, por fonte e por disciplina: decisões, ações com responsável e prazo, tópicos em aberto, ideias e
          informações. Busque, filtre por Estrutura ou por pessoa, e encontre o que foi combinado em segundos.
        </Feature>
        <Feature index={3} kicker="Detalhe da decisão" title="O porquê e o consenso, junto com a decisão." visual={<DecisionVisual />}>
          Quem decidiu, a justificativa, quais disciplinas concordaram e quais impactos isso tem. E o trecho exato da gravação, para tirar a dúvida na
          hora.
        </Feature>
        <Feature index={4} kicker="Reunião com transcrição" title="Da fala ao item, com um clique." visual={<TranscriptVisual />} reverse>
          A transcrição fica lado a lado com os itens extraídos. Clique numa decisão para ir ao momento em que ela foi falada. Quando duas vozes se
          sobrepõem, o Promem avisa e pede para confirmar quem falou.
        </Feature>
        <Feature index={5} kicker="Aprovação de ingestão" title="Só entra no projeto o que você aprovar." visual={<InboxVisual />}>
          Reuniões, e-mails e documentos chegam numa caixa de entrada. Você vê o resumo, o projeto sugerido e o motivo da sugestão, e aprova ou recusa.
          Nada é processado sem o seu ok.
        </Feature>
      </div>
    </section>
  )
}

const AUDIENCE = [
  {
    title: 'Escritórios de arquitetura e BIM',
    text: 'Para sócios e diretores com vários projetos em andamento, que precisam saber onde cada um está sem depender de reunião de status.',
  },
  {
    title: 'Projetistas e consultores',
    text: 'Estrutura, instalações, elétrica, paisagismo: cada disciplina vê o que foi decidido e o que a afeta, sem caçar a informação em e-mails.',
  },
  {
    title: 'Construtoras e incorporadoras',
    text: 'Um registro claro do que foi combinado em cada etapa, para reduzir aditivos, retrabalho e discussões na obra.',
  },
]

function Audience() {
  return (
    <section id="para-quem" aria-labelledby="para-quem-titulo" className={cn(CONTAINER, SECTION_Y, 'flex flex-col gap-8')}>
      <SectionHeading id="para-quem-titulo" eyebrow="Para quem" title="Para quem decide o projeto todo dia." />
      <ul className="grid gap-8 md:grid-cols-3">
        {AUDIENCE.map((item) => (
          <li key={item.title} className="flex flex-col gap-2.5 border-t-2 border-ink pt-4">
            <h3 className="text-h2 font-bold text-ink">{item.title}</h3>
            <p className="text-pretty text-h3 font-normal leading-relaxed text-ink-soft">{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Origin() {
  return (
    <section aria-labelledby="origem-titulo" className="bg-ink text-on-dark">
      <div className={cn(CONTAINER, 'flex flex-col gap-12 py-20 lg:flex-row lg:gap-14 lg:py-24')}>
        <div className="flex min-w-0 flex-col gap-4 lg:flex-[1.15]">
          <Eyebrow tone="dark">De onde viemos</Eyebrow>
          <h2 id="origem-titulo" className="text-balance text-section-sm text-on-dark">
            Nasceu dentro de um escritório de BIM, para resolver um problema do próprio escritório.
          </h2>
          <p className="text-pretty font-serif text-reading-lg text-on-dark-2">
            Na souBIM, a diretora era o gargalo de todas as decisões, em vários projetos ao mesmo tempo. O Promem foi criado para que a equipe pudesse
            decidir sozinha, deixando um registro confiável que ela consegue ler depois, em minutos. Foi validado nos projetos reais da souBIM antes de
            chegar a outros escritórios.
          </p>
          {/* TODO: souBIM logo file (use souBIM's own, BRAND.md). */}
          <Placeholder tone="dark" className="self-start">
            [Logo souBIM]
          </Placeholder>
        </div>
        {/* Testimonial: publish only with the director's written consent (brief Q4). */}
        <figure data-placeholder="" className="m-0 flex min-w-0 flex-col gap-4 rounded-lg border border-dashed border-on-dark-line p-6 lg:flex-1 lg:p-7">
          <p className="font-mono text-mono-sm uppercase tracking-widest text-on-dark-3">Depoimento · aguardando autorização</p>
          <blockquote className="m-0 text-pretty font-serif text-h2 font-normal italic tracking-normal text-on-dark-2 md:text-h1 md:font-normal md:tracking-normal">
            “[Depoimento da diretora da souBIM sobre como o Promem mudou a rotina de decisões do escritório.]”
          </blockquote>
          <figcaption className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-on-dark-line text-mono-sm text-on-dark-3">
              [foto]
            </span>
            <span className="flex flex-col text-small">
              <Placeholder tone="dark" className="self-start font-semibold">
                [Nome]
              </Placeholder>
              <span className="text-on-dark-3">Diretora, souBIM</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

const SECURITY: { title: string; text: string; placeholder?: string }[] = [
  { title: 'Nada entra sem aprovação', text: 'Cada reunião, e-mail ou documento passa pela caixa de ingestão. Só o que você aprova é processado.' },
  {
    title: 'Os dados são do seu escritório',
    text: 'O conteúdo dos seus projetos pertence ao seu escritório.',
    placeholder: '[Validar termos de propriedade e exportação de dados]',
  },
  {
    title: 'Links com prazo e revogação',
    text: 'O cliente vê só os marcos, por um link somente leitura que expira e pode ser revogado a qualquer momento.',
  },
  { title: 'LGPD', text: 'Tratamento de dados pessoais conforme a Lei Geral de Proteção de Dados.', placeholder: '[Texto jurídico a validar antes de publicar]' },
]

function Security() {
  return (
    <section id="seguranca" aria-labelledby="seguranca-titulo" className={cn(CONTAINER, SECTION_Y, 'flex flex-col gap-8')}>
      <SectionHeading id="seguranca-titulo" eyebrow="Segurança e dados" title="Os dados do escritório são do escritório." />
      <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
        {SECURITY.map((item) => (
          <li key={item.title} className="flex flex-col items-start gap-2 bg-surface p-6">
            <h3 className="text-h3 text-ink">{item.title}</h3>
            <p className="text-pretty text-body text-ink-soft">{item.text}</p>
            {item.placeholder && <Placeholder className="mt-1">{item.placeholder}</Placeholder>}
          </li>
        ))}
      </ul>
    </section>
  )
}

const FAQ: { q: string; a: string; placeholder?: string }[] = [
  {
    q: 'Quanto tempo leva para começar?',
    a: 'A configuração é guiada pela nossa equipe: conectamos o gravador de reuniões, o Gmail e o Google Drive e criamos o primeiro projeto com você.',
    placeholder: '[Informar tempo médio de configuração]',
  },
  {
    q: 'Quais gravadores de reunião funcionam com o Promem?',
    a: 'Tactiq, Fireflies e Fathom. Além disso, e-mails do Gmail, documentos do Google Drive (PDF e DOCX) e itens adicionados manualmente.',
  },
  {
    q: 'As reuniões em português funcionam bem?',
    a: 'O Promem foi feito e testado em projetos brasileiros, com reuniões em português e o vocabulário de AEC: etapas, disciplinas e termos de obra.',
    placeholder: '[Confirmar idiomas suportados]',
  },
  {
    q: 'Minha equipe precisa mudar a forma de trabalhar?',
    a: 'Não. As reuniões continuam no mesmo lugar, os e-mails no Gmail e os arquivos no Drive. O Promem trabalha em segundo plano e você só aprova o que entra.',
  },
  {
    q: 'Quem vê as informações do projeto?',
    a: 'Só a equipe do projeto. Clientes e fornecedores veem apenas os marcos, por um link somente leitura que você controla.',
    placeholder: '[Detalhar permissões por papel]',
  },
  {
    q: 'Como funciona o piloto gratuito?',
    a: 'É um piloto guiado de 30 dias, com um número limitado de reuniões, em um projeto real do seu escritório. Ao final, avaliamos juntos os resultados.',
    placeholder: '[Definir limite de reuniões do piloto]',
  },
]

/** Native <details name="…">: one open at a time, works without JS. */
function Faq() {
  const Plus = Icons.add
  const Minus = Icons.abstain
  return (
    <section id="perguntas" aria-labelledby="perguntas-titulo" className="scroll-mt-16 border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-7 px-6 py-20 lg:py-24">
        <h2 id="perguntas-titulo" className="text-section-sm text-ink">
          Perguntas frequentes
        </h2>
        <div className="flex flex-col border-t border-ink">
          {FAQ.map((item) => (
            <details key={item.q} name="perguntas" className="group border-b border-line">
              <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-5 text-h2 text-ink [&::-webkit-details-marker]:hidden">
                <span className="text-pretty">{item.q}</span>
                <Plus className="h-5 w-5 shrink-0 text-ink-2 group-open:hidden" strokeWidth={1.75} aria-hidden />
                <Minus className="hidden h-5 w-5 shrink-0 text-ink-2 group-open:block" strokeWidth={1.75} aria-hidden />
              </summary>
              <div className="flex flex-col items-start gap-2 pb-6">
                <p className="text-pretty text-h3 font-normal leading-relaxed text-ink-soft">{item.a}</p>
                {item.placeholder && <Placeholder>{item.placeholder}</Placeholder>}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

const CHECKLIST = ['Configuração guiada: gravador de reuniões, Gmail e Drive', 'Sem cartão de crédito', 'Respondemos pelo WhatsApp, se você preferir']

function Contact() {
  const Check = Icons.check
  return (
    <section id="contato" aria-labelledby="contato-titulo" className={cn(CONTAINER, SECTION_Y, 'grid items-start gap-12 lg:grid-cols-2')}>
      <div className="flex min-w-0 flex-col gap-5">
        <h2 id="contato-titulo" className="text-balance text-section text-ink">
          Veja o Promem com um projeto parecido com o seu.
        </h2>
        <p className="text-pretty font-serif text-reading-lg text-ink-soft">
          Na demonstração, mostramos o fluxo completo em 30 minutos. No piloto gratuito, configuramos junto com você e acompanhamos 30 dias de projeto
          real, com um número limitado de reuniões.
        </p>
        <ul className="flex flex-col gap-2.5 text-h3 font-normal text-ink">
          {CHECKLIST.map((line) => (
            <li key={line} className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </div>
      <ContactForm />
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className={cn(CONTAINER, 'flex flex-wrap items-start gap-x-12 gap-y-6 py-9 text-small text-ink-2')}>
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
          <Wordmark size={20} endorsed />
          <p>Memória de projeto para arquitetura e construção.</p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="flex flex-col">
            {NAV.slice(1).map((item) => (
              <li key={item.href}>
                <a href={item.href} className="inline-flex min-h-touch items-center rounded-sm text-ink-2 no-underline hover:text-ink md:min-h-0 md:py-0.5">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {/* TODO: contact e-mail, WhatsApp number, CNPJ and address (LANDING_COPY placeholder checklist). */}
        <div className="flex flex-col items-start gap-1.5">
          <Placeholder>[e-mail de contato]</Placeholder>
          <Placeholder>[WhatsApp]</Placeholder>
          <Placeholder>[CNPJ · endereço]</Placeholder>
        </div>
        <p className="basis-full text-caption">© 2026 Promem · um produto souBIM</p>
      </div>
    </footer>
  )
}

export function Landing() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-30 rounded-md bg-ink px-4 py-3 text-small font-semibold text-on-dark focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Hero />
        <Integrations />
        <Pains />
        <HowItWorks />
        <Features />
        <Audience />
        <Origin />
        <Security />
        {/* Room for a future pricing section (LANDING_COPY: between Segurança and Perguntas). */}
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
