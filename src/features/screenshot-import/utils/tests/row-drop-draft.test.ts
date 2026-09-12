import { describe, expect, it } from 'vitest'

import type { OcrJob } from '../../types'
import {
  canConfirmTogether,
  contradictsRow,
  createReviewDraft,
  needsItemReview,
} from '../review-import'

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
      // The level word sits beside the dialog's separator glyph and reads badly.
      level: { value: 101, confidence: 2 },
      type: { value: 'Bone', confidence: 96 },
      tiers: { 1: { value: 919, confidence: 96 } },
    },
  },
  match: { itemId: 123, confident: true, candidates: [] },
} satisfies OcrJob

describe('a screenshot dropped on an ingredient row', () => {
  it('takes its item from the row rather than from matching', () => {
    const draft = createReviewDraft({ ...job, lockedItemId: 456 })
    expect(draft.itemId).toBe(456)
    expect(draft.itemReviewed).toBe(true)
  })

  it('needs no item review, so the row path skips the level-confidence gate', () => {
    const dropped = { ...job, lockedItemId: 123 }
    const draft = createReviewDraft(dropped)
    expect(needsItemReview(dropped, draft)).toBe(false)
    expect(canConfirmTogether(dropped, draft)).toBe(true)
  })

  it('still asks about a screenshot that confidently names a different item', () => {
    const misdropped = { ...job, lockedItemId: 456 }
    const draft = createReviewDraft(misdropped)
    expect(contradictsRow(misdropped, draft)).toBe(true)
    expect(needsItemReview(misdropped, draft)).toBe(true)
    expect(canConfirmTogether(misdropped, draft)).toBe(false)
  })

  it('stops objecting once the item is chosen by hand', () => {
    const misdropped = { ...job, lockedItemId: 456 }
    const draft = { ...createReviewDraft(misdropped), itemId: 123 }
    expect(contradictsRow(misdropped, draft)).toBe(false)
    expect(needsItemReview(misdropped, draft)).toBe(false)
  })

  it('leaves an unmatched screenshot alone, since the row is the only identity', () => {
    const unmatched = {
      ...job,
      lockedItemId: 456,
      match: { confident: false, candidates: [] },
    }
    const draft = createReviewDraft(unmatched)
    expect(contradictsRow(unmatched, draft)).toBe(false)
    expect(draft.itemId).toBe(456)
    expect(canConfirmTogether(unmatched, draft)).toBe(true)
  })
})
