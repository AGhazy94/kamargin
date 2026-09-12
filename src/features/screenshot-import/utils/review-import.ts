import {
  type PriceEntry,
  readPriceBook,
  restorePackPrices,
  restorePriceEntry,
} from '@/stores/price-book'
import { PACK_TIERS, type PackPrices } from '@/utils/pack-tiers'

import {
  OCR_CONFIDENCE_THRESHOLD,
  type OcrJob,
  type ReviewDraft,
} from '../types'

export function createReviewDraft(job: OcrJob): ReviewDraft {
  return {
    itemId: job.lockedItemId ?? job.match?.itemId,
    itemReviewed: job.lockedItemId !== undefined,
    prices: Object.fromEntries(
      Object.entries(job.reading?.parsed.tiers ?? {}).map(([tier, field]) => [
        tier,
        field.value,
      ]),
    ),
    reviewedTiers: [],
  }
}

export function flaggedTiers(job: OcrJob, draft: ReviewDraft) {
  return PACK_TIERS.filter(
    (tier) =>
      !draft.reviewedTiers.includes(tier) &&
      ((job.reading?.parsed.tiers[tier]?.confidence ?? 100) <
        OCR_CONFIDENCE_THRESHOLD ||
        job.reading?.parsed.missingTiers?.includes(tier)),
  )
}

export function contradictsRow(job: OcrJob, draft: ReviewDraft) {
  return (
    job.lockedItemId !== undefined &&
    draft.itemId === job.lockedItemId &&
    job.match?.confident === true &&
    job.match.itemId !== job.lockedItemId
  )
}

export function needsItemReview(job: OcrJob, draft: ReviewDraft) {
  const parsed = job.reading?.parsed
  // A row names the item, but a screenshot that names a different one is a mis-drop.
  if (contradictsRow(job, draft)) return true
  return (
    !draft.itemReviewed &&
    (!job.match?.confident ||
      [parsed?.title, parsed?.level, parsed?.type].some(
        (field) => field && field.confidence < OCR_CONFIDENCE_THRESHOLD,
      ))
  )
}

export function canConfirm(draft: ReviewDraft) {
  const prices = Object.values(draft.prices).filter(
    (price) => price !== undefined,
  )
  return (
    draft.itemId !== undefined &&
    prices.length > 0 &&
    prices.every((price) => Number.isSafeInteger(price) && price > 0)
  )
}

export function canConfirmTogether(job: OcrJob, draft: ReviewDraft) {
  return (
    job.status === 'ready' &&
    canConfirm(draft) &&
    job.reading?.location.confident === true &&
    !needsItemReview(job, draft) &&
    flaggedTiers(job, draft).length === 0 &&
    (job.reading?.parsed.averagePrice?.confidence ?? 100) >=
      OCR_CONFIDENCE_THRESHOLD
  )
}

export type ImportReceipt = {
  serverId: number
  itemId: number
  previous?: PriceEntry
  applied: PriceEntry
}

export function confirmImport(
  serverId: number,
  itemId: number,
  prices: PackPrices,
): ImportReceipt {
  const values = PACK_TIERS.flatMap((tier) =>
    prices[tier] === undefined ? [] : [prices[tier]],
  )
  if (
    !values.length ||
    values.some((value) => !Number.isSafeInteger(value) || value <= 0)
  ) {
    throw new Error('Enter at least one valid pack price before confirming.')
  }
  const previous = readPriceBook(serverId)[itemId]
  restorePackPrices(serverId, { [itemId]: prices })
  const applied = readPriceBook(serverId)[itemId]
  return { serverId, itemId, previous, applied }
}

export function undoImport(receipt: ImportReceipt) {
  return restorePriceEntry(
    receipt.serverId,
    receipt.itemId,
    receipt.previous,
    receipt.applied,
  )
}
