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

// Base card chrome comes from the card_style tokens (--card-bg / --card-border-color),
// so a theme can flip filled/hairline/borderless without touching this component.
// The accent tone keeps its accent border as the deliberate visual anchor.
function cardToneClasses(tone: CardTone) {
  switch (tone) {
    case 'accent':
      return 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text)]'
    case 'alt':
      return 'bg-[var(--surface-alt)] border-[var(--card-border-color)] text-[var(--text)]'
    case 'default':
    default:
      return 'bg-[var(--card-bg)] border-[var(--card-border-color)] text-[var(--text)]'
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
        'flex flex-col border rounded-[var(--card-radius)]',
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

// ─────────────────────────────────────────────────────────────────────────
// 카드 micro-data-viz (#4) — KPI를 '큰 숫자' 한 톤이 아니라 trend + progress +
// 비교 컨텍스트로 채워 카드 밀도를 유의미하게 올린다.
// ─────────────────────────────────────────────────────────────────────────

export function TrendArrow({
  dir,
  className,
}: {
  dir: 'up' | 'down' | 'flat'
  className?: string
}) {
  const color =
    dir === 'up' ? 'var(--positive)' : dir === 'down' ? 'var(--negative)' : 'var(--text-tertiary)'
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {dir === 'up' ? (
        <>
          <path d="M3 17l6-6 4 4 7-7" />
          <path d="M17 8h4v4" />
        </>
      ) : dir === 'down' ? (
        <>
          <path d="M3 7l6 6 4-4 7 7" />
          <path d="M17 16h4v-4" />
        </>
      ) : (
        <path d="M3 12h18" />
      )}
    </svg>
  )
}

export function MetricBar({
  value,
  label,
  percent,
  trend,
  context,
  accent = false,
  className,
}: {
  value: ReactNode
  label: ReactNode
  /** 0–100. 있으면 accent progress 바를 그린다 */
  percent?: number
  /** 숫자 옆 추세 화살표 (semantic color) */
  trend?: 'up' | 'down' | 'flat'
  /** 비교 컨텍스트 줄 — 예: "vs 업계평균 3.2%". 카드 하단 밀도의 핵심 */
  context?: ReactNode
  accent?: boolean
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-[8px]', className)}>
      <div className="flex items-end justify-between">
        <div className={cx('display-sm leading-none', accent && 'text-[var(--accent)]')}>{value}</div>
        {trend ? <TrendArrow dir={trend} /> : null}
      </div>
      <div className="caption">{label}</div>
      {typeof percent === 'number' ? (
        <div className="h-[6px] w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          />
        </div>
      ) : null}
      {context ? <div className="caption text-[var(--text-tertiary)]">{context}</div> : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Hairline 에디토리얼 프리미티브 (#5) — 카드 박스 대신 1px 라인으로 구성한
// '리포트 텍스처'. 목록·열 비교를 카드 그리드의 대안으로 제공(카드 단조로움 탈피).
// ─────────────────────────────────────────────────────────────────────────

export function RuledList({
  eyebrow,
  items,
  className,
}: {
  eyebrow?: ReactNode
  items: Array<{ label: ReactNode; body: ReactNode; accent?: boolean }>
  className?: string
}) {
  return (
    <div className={cx('flex flex-col', className)}>
      {eyebrow ? <div className="label-caption mb-[12px]">{eyebrow}</div> : null}
      {items.map((it, i) => (
        <div key={i}>
          {i > 0 ? <RuleLine /> : null}
          <div className="flex items-baseline gap-[20px] py-[16px]">
            <div className={cx('title w-[220px] shrink-0', it.accent && 'text-[var(--accent)]')}>
              {it.label}
            </div>
            <div className="body flex-1 text-[var(--text-secondary)]">{it.body}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function RuledColumns({
  eyebrow,
  columns,
  className,
}: {
  eyebrow?: ReactNode
  columns: Array<{ heading: ReactNode; body: ReactNode; accent?: boolean }>
  className?: string
}) {
  return (
    <div className={cx('flex flex-col', className)}>
      {eyebrow ? <div className="label-caption mb-[16px]">{eyebrow}</div> : null}
      <div className="flex flex-1">
        {columns.map((c, i) => (
          <div
            key={i}
            className={cx(
              'flex flex-1 flex-col gap-[8px] px-[28px]',
              i === 0 && 'pl-0',
              i > 0 && 'border-l border-[var(--border)]',
            )}
          >
            <div className={cx('title', c.accent && 'text-[var(--accent)]')}>{c.heading}</div>
            <div className="body text-[var(--text-secondary)]">{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
