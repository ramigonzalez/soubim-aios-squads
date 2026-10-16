/**
 * Concept → lucide-react icon map (COMPONENTS.md §1).
 * Feature code imports icons from here, never SVG paths from the prototypes.
 */
import { forwardRef } from 'react'
import {
  Calendar, Check, ChevronDown, ChevronUp, ChevronsUpDown, CircleCheck, CirclePlay, Copy, Download,
  Ellipsis, FileText, Folder, GitCommitVertical, History, Inbox, Info, KeyRound, LayoutDashboard, Lightbulb, Link,
  LogOut, Mail, Menu, MessageCircle, Minus, Pencil, Plug, Plus, Search, Share2, ShieldCheck, Square, SquareCheck, Star,
  Trash, TriangleAlert, Upload, Users, Video, X,
} from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'

/** Default stroke for every icon in the system. */
export const ICON_STROKE = 1.75

/** "Com ressalvas" (lucide has no Tilde in this version). Same grid and stroke props as lucide. */
export const TildeIcon = forwardRef<SVGSVGElement, LucideProps>(function TildeIcon(
  { size = 24, strokeWidth = 2, color = 'currentColor', ...rest },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M2 15c6.667-6 13.333 0 20-6" />
    </svg>
  )
}) as unknown as LucideIcon

export const Icons = {
  // Item types
  decision: CircleCheck,
  actionOpen: Square,
  actionDone: SquareCheck,
  topic: MessageCircle,
  idea: Lightbulb,
  information: Info,
  // Sources
  meeting: Video,
  email: Mail,
  document: FileText,
  manual: Pencil,
  // Navigation
  overview: LayoutDashboard,
  milestones: GitCommitVertical,
  history: History,
  meetings: Video,
  summary: FileText,
  projects: Folder,
  ingestion: Inbox,
  search: Search,
  switcher: ChevronsUpDown,
  more: Ellipsis,
  // Controls and states
  milestone: Star,
  dropdown: ChevronDown,
  previous: ChevronUp,
  next: ChevronDown,
  close: X,
  agree: Check,
  mixed: TildeIcon,
  dissent: X,
  abstain: Minus,
  check: Check,
  add: Plus,
  warning: TriangleAlert,
  link: Link,
  calendar: Calendar,
  play: CirclePlay,
  upload: Upload,
  download: Download,
  remove: Trash,
  copy: Copy,
  team: Users,
  // Shell and account
  menu: Menu,
  platform: ShieldCheck,
  integrations: Plug,
  password: KeyRound,
  logout: LogOut,
  share: Share2,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof Icons
export type { LucideIcon }
