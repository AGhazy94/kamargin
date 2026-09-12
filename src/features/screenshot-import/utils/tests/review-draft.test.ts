import { describe, expect, it } from 'vitest'

import type { OcrJob } from '../../types'
import { parseDialog } from '../parse-dialog'
import {
  canConfirm,
  canConfirmTogether,
  createReviewDraft,
  flaggedTiers,
} from '../review-import'
import { fixtureFor } from './fixtures'

const job = {
  id: 'image',
  file: {} as File,
  sourceUrl: 'blob:image',
  status: 'ready',
  phase: 'Ready',
  progress: 1,
  reading: {
    width: 100,
    height: 100,
    location: {
      crop: { left: 0, top: 0, width: 100, height: 100 },
      confident: true,
    },
    parsed: {
      isMarketDialog: true,
      title: { value: 'Kido Beak', confidence: 96 },
      tiers: { 1: { value: 919, confidence: 96 } },
    },
  },
  match: { itemId: 123, confident: true, candidates: [] },
} satisfies OcrJob

describe('review draft eligibility', () => {
  it('flags an observed tier with an unread price instead of bulk-confirming the partial read', () => {
    const parsed = parseDialog(
      fixtureFor('7.07.16').words.filter((word) => word.text !== '23,998'),
    )
    expect(parsed.missingTiers).toEqual([10])
    const partial = { ...job, reading: { ...job.reading, parsed } }
    const draft = { ...createReviewDraft(partial), itemReviewed: true }
    expect(draft.prices[10]).toBeUndefined()
    expect(flaggedTiers(partial, draft)).toEqual([10])
    expect(canConfirmTogether(partial, draft)).toBe(false)
  })

  it('allows confident partial tier coverage without inventing missing offers', () => {
    const draft = createReviewDraft(job)
    expect(draft.prices).toEqual({ 1: 919 })
    expect(canConfirmTogether(job, draft)).toBe(true)
  })

  it('excludes low-confidence prices until explicitly edited', () => {
    const uncertain = {
      ...job,
      reading: {
        ...job.reading,
        parsed: {
          ...job.reading.parsed,
          tiers: { 1: { value: 919, confidence: 10 } },
        },
      },
    }
    const draft = createReviewDraft(uncertain)
    expect(flaggedTiers(uncertain, draft)).toEqual([1])
    expect(canConfirm(draft)).toBe(true)
    expect(canConfirmTogether(uncertain, draft)).toBe(false)
    expect(
      canConfirmTogether(uncertain, { ...draft, reviewedTiers: [1] }),
    ).toBe(true)
  })

  it('requires a manual item choice for an ambiguous match', () => {
    const uncertain = { ...job, match: { candidates: [], confident: false } }
    const draft = createReviewDraft(uncertain)
    expect(canConfirm(draft)).toBe(false)
    expect(
      canConfirmTogether(uncertain, {
        ...draft,
        itemId: 123,
        itemReviewed: true,
      }),
    ).toBe(true)
  })

  it('excludes uncertain crops and low-confidence metadata or averages', () => {
    const draft = createReviewDraft(job)
    const reading = job.reading
    expect(
      canConfirmTogether(
        {
          ...job,
          reading: {
            ...reading,
            location: { ...reading.location, confident: false },
          },
        },
        draft,
      ),
    ).toBe(false)
    expect(
      canConfirmTogether(
        {
          ...job,
          reading: {
            ...reading,
            parsed: {
              ...reading.parsed,
              level: { value: 101, confidence: 10 },
            },
          },
        },
        draft,
      ),
    ).toBe(false)
    expect(
      canConfirmTogether(
        {
          ...job,
          reading: {
            ...reading,
            parsed: {
              ...reading.parsed,
              averagePrice: { value: 814, confidence: 10 },
            },
          },
        },
        draft,
      ),
    ).toBe(false)
  })

  it('never includes pending images or invalid edited values', () => {
    const draft = createReviewDraft(job)
    expect(canConfirmTogether({ ...job, status: 'reading' }, draft)).toBe(false)
    expect(canConfirm({ ...draft, prices: {} })).toBe(false)
    expect(canConfirm({ ...draft, prices: { 1: 0 } })).toBe(false)
    expect(
      canConfirm({ ...draft, prices: { 1: Number.MAX_SAFE_INTEGER + 1 } }),
    ).toBe(false)
  })
})
