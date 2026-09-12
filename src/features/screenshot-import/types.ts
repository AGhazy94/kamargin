import type { Item, PackTier } from '@/types/game'
import type { PackPrices } from '@/utils/pack-tiers'

export const OCR_CONFIDENCE_THRESHOLD = 70

export type Word = {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
  confidence: number
}

export type CropRect = {
  left: number
  top: number
  width: number
  height: number
}

export type DialogLocation = {
  crop: CropRect
  priceBand?: CropRect
  confident: boolean
}

export type OcrField<Value> = { value: Value; confidence: number }

export type ParsedDialog = {
  isMarketDialog: boolean
  title?: OcrField<string>
  level?: OcrField<number>
  type?: OcrField<string>
  averagePrice?: OcrField<number>
  tiers: Partial<Record<PackTier, OcrField<number>>>
  missingTiers?: PackTier[]
}

export type ItemMatch = {
  itemId?: number
  confident: boolean
  candidates: { item: Item; distance: number; score: number }[]
}

export type OcrReading = {
  parsed: ParsedDialog
  location: DialogLocation
  width: number
  height: number
}

/** A file to read, optionally already bound to an item by where it was dropped. */
export type ImportRequest = { file: File; itemId?: number }

export type OcrJob = {
  id: string
  file: File
  /** Set when the drop named the item, so matching has nothing left to decide. */
  lockedItemId?: number
  sourceUrl: string
  status: 'queued' | 'reading' | 'ready' | 'error' | 'cancelled'
  progress: number
  phase: string
  error?: string
  reading?: OcrReading
  match?: ItemMatch
}

export type ReviewDraft = {
  itemId?: number
  itemReviewed: boolean
  prices: PackPrices
  reviewedTiers: PackTier[]
}
