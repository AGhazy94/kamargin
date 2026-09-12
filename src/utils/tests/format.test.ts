import { describe, expect, it } from 'vitest'

import { formatAge, formatKamas, formatMargin } from '../format'

const NBSP = ' '

describe('formatKamas', () => {
  it('groups thousands with a non-breaking space', () => {
    expect(formatKamas(11650)).toBe(`11${NBSP}650`)
    expect(formatKamas(1234567)).toBe(`1${NBSP}234${NBSP}567`)
  })

  it('keeps small and negative figures intact', () => {
    expect(formatKamas(0)).toBe('0')
    expect(formatKamas(-720)).toBe('-720')
  })

  it('rounds — kamas are whole', () => {
    expect(formatKamas(10734.69)).toBe(`10${NBSP}735`)
  })
})

describe('formatMargin', () => {
  it('renders one decimal', () => {
    expect(formatMargin(0.023)).toBe('2.3%')
    expect(formatMargin(-0.0684)).toBe('-6.8%')
    expect(formatMargin(1)).toBe('100.0%')
  })
})

describe('formatAge', () => {
  const now = Date.parse('2026-09-12T12:00:00Z')
  const ago = (ms: number) => formatAge(now - ms, now)

  it('describes the age in the largest unit that fits', () => {
    expect(ago(5_000)).toBe('just now')
    expect(ago(3 * 60_000)).toBe('3 min ago')
    expect(ago(3 * 3_600_000)).toBe('3 h ago')
    expect(ago(50 * 3_600_000)).toBe('2 d ago')
  })

  it('does not run backwards on a clock skew', () => {
    expect(formatAge(now + 10_000, now)).toBe('just now')
  })
})
