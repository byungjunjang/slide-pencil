import type { CSSProperties, ReactNode } from 'react'

type PillTone = 'accent' | 'dark' | 'soft' | 'outline'
export type CardTone = 'default' | 'alt' | 'accent'

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function pillToneClasses(tone: PillTone) {
  switch (tone) {
    case 'accent':
      return 'bg-[var(--accent)] text-[var(--surface)] border border-[var(--accent)]'
    case 'dark':
      return 'bg-[var(--text)] text-[var(--surface)] border border-[var(--text)]'
    case 'outline':
      return 'bg-transparent text-[var(--accent)] border border-[var(--accent)]'
    case 'soft':
    default:
      return 'bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--border)]'
  }
}

function cardToneClasses(tone: CardTone) {
  switch (tone) {
    case 'accent':
      return 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text)]'
    case 'alt':
      return 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text)]'
    case 'default':
    default:
      return 'bg-[var(--surface)] border-[var(--border)] text-[var(--text)]'
  }
}

export function SlideShell({
  children,
  gm,
  className,
  style,
}: {
  children: ReactNode
  gm?: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      style={style}
      className={cx(
        'relative flex w-[1280px] h-[720px] flex-col overflow-hidden',
        'bg-[var(--bg)] text-[var(--text)] font-sans',
        className,
      )}
    >
      {children}
      {gm ? <GuidingMessage>{gm}</GuidingMessage> : null}
    </div>
  )
}

export function SlideBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cx('flex flex-1 flex-col px-[80px] py-[56px]', className)}>{children}</div>
}

export function SlideMeta({
  section,
  page,
  className,
}: {
  section: ReactNode
  page: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-row justify-between items-center', className)}>
      <span className="label-caption">{section}</span>
      <span className="caption">{page}</span>
    </div>
  )
}

export function Pill({
  children,
  tone = 'soft',
  className,
}: {
  children: ReactNode
  tone?: PillTone
  className?: string
}) {
  return (
    <div
      className={cx(
        'caption inline-flex w-fit items-center rounded-full px-[12px] py-[4px] tracking-[0.06em] uppercase',
        pillToneClasses(tone),
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AccentBadge({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'caption inline-flex w-fit items-center rounded-full px-[10px] py-[3px]',
        'bg-[var(--accent-soft)] text-[var(--accent)] uppercase tracking-[0.08em] font-[600]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SectionHeader({
  tag,
  title,
  subtitle,
}: {
  tag?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-baseline gap-[12px]">
        <h2 className="headline">{title}</h2>
        {tag ? <Pill tone="soft">{tag}</Pill> : null}
      </div>
      {subtitle ? (
        <div className="body max-w-[820px] text-[var(--text-secondary)]">{subtitle}</div>
      ) : null}
    </div>
  )
}

export function Card({
  children,
  tone = 'default',
  centered = false,
  padded = true,
  className,
  style,
}: {
  children: ReactNode
  tone?: CardTone
  centered?: boolean
  padded?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      style={style}
      className={cx(
        'flex flex-col border rounded-[var(--radius-lg)]',
        padded && 'p-[var(--card-padding)]',
        cardToneClasses(tone),
        centered && 'items-center justify-center text-center',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function NumberBadge({
  children,
  tone = 'accent',
  size = 'md',
  className,
}: {
  children: ReactNode
  tone?: 'accent' | 'dark' | 'light'
  size?: 'sm' | 'md'
  className?: string
}) {
  const toneClass =
    tone === 'light'
      ? 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]'
      : tone === 'dark'
        ? 'bg-[var(--text)] text-[var(--surface)]'
        : 'bg-[var(--accent)] text-[var(--surface)]'

  const sizeClass =
    size === 'sm'
      ? 'h-[32px] w-[32px] text-[14px]'
      : 'h-[36px] w-[36px] text-[16px]'

  return (
    <div
      className={cx(
        'flex items-center justify-center rounded-full font-[800] flex-shrink-0',
        sizeClass,
        toneClass,
        className,
      )}
    >
      {children}
    </div>
  )
}

export function NumKickerHead({
  num,
  kicker,
  accent = false,
  size = 'md',
}: {
  num: ReactNode
  kicker: ReactNode
  accent?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <div className={cx('flex items-center', size === 'sm' ? 'gap-[10px]' : 'gap-[12px]')}>
      <NumberBadge size={size}>{num}</NumberBadge>
      <span
        className="label-caption"
        style={accent ? { color: 'var(--accent)' } : undefined}
      >
        {kicker}
      </span>
    </div>
  )
}

export function Metric({
  value,
  label,
  accent = false,
  className,
}: {
  value: ReactNode
  label: ReactNode
  accent?: boolean
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-[4px]', className)}>
      <div className={cx('display-sm leading-none', accent && 'text-[var(--accent)]')}>{value}</div>
      <div className="caption">{label}</div>
    </div>
  )
}

export function GuidingMessage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'gm absolute bottom-[20px] left-0 right-0 text-center caption text-[var(--text-secondary)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function RuleLine({ className }: { className?: string }) {
  return <hr className={cx('h-px border-0 bg-[var(--border)]', className)} />
}

export function BulletCheck({
  children,
  accent = false,
  className,
}: {
  children: ReactNode
  accent?: boolean
  className?: string
}) {
  return (
    <li
      className={cx('flex gap-[12px] body', className)}
      style={{ color: accent ? 'var(--accent-ink)' : 'var(--text-secondary)' }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 4 }}
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{children}</span>
    </li>
  )
}
