const GROUPED = new Intl.NumberFormat('en-US')
const GROUP_SEPARATOR = ' '

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function formatKamas(value: number): string {
  return GROUPED.format(Math.round(value)).replaceAll(',', GROUP_SEPARATOR)
}

export function formatMargin(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

export function formatAge(capturedAt: number, now = Date.now()): string {
  const elapsed = Math.max(0, now - capturedAt)

  if (elapsed < MINUTE_MS) return 'just now'
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} min ago`
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} h ago`
  return `${Math.floor(elapsed / DAY_MS)} d ago`
}
