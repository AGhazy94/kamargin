import type { PackTier } from '@/types/game'
import { PACK_TIERS } from '@/utils/pack-tiers'

import type { OcrField, ParsedDialog, Word } from '../types'

export function wordBounds(words: readonly Word[]): Word['bbox'] {
  return {
    x0: Math.min(...words.map((word) => word.bbox.x0)),
    y0: Math.min(...words.map((word) => word.bbox.y0)),
    x1: Math.max(...words.map((word) => word.bbox.x1)),
    y1: Math.max(...words.map((word) => word.bbox.y1)),
  }
}

export function medianWordHeight(words: readonly Word[]) {
  const heights = words
    .map((word) => word.bbox.y1 - word.bbox.y0)
    .filter((height) => Number.isFinite(height) && height > 0)
    .sort((first, second) => first - second)
  return heights[Math.floor(heights.length / 2)] ?? 1
}

export function groupWordRows(words: readonly Word[]) {
  const height = medianWordHeight(words)
  const ordered = words
    .filter((word) => {
      const bounds = word.bbox
      return (
        word.text.trim() &&
        Object.values(bounds).every(Number.isFinite) &&
        bounds.x1 > bounds.x0 &&
        bounds.y1 > bounds.y0 &&
        bounds.y1 - bounds.y0 <= height * 2
      )
    })
    .toSorted(
      (first, second) =>
        first.bbox.y0 - second.bbox.y0 || first.bbox.x0 - second.bbox.x0,
    )
  const rows: Word[][] = []
  for (const word of ordered) {
    const row = rows.find((candidate) =>
      candidate.some((member) => {
        const overlap =
          Math.min(member.bbox.y1, word.bbox.y1) -
          Math.max(member.bbox.y0, word.bbox.y0)
        return (
          overlap >=
          Math.min(
            member.bbox.y1 - member.bbox.y0,
            word.bbox.y1 - word.bbox.y0,
          ) /
            2
        )
      }),
    )
    if (row) row.push(word)
    else rows.push([word])
  }
  return rows
    .map((row) =>
      row.toSorted((first, second) => first.bbox.x0 - second.bbox.x0),
    )
    .sort((first, second) => wordBounds(first).y0 - wordBounds(second).y0)
}

function field<Value>(value: Value, words: readonly Word[]): OcrField<Value> {
  return {
    value,
    confidence: Math.min(
      ...words.map((word) =>
        Number.isFinite(word.confidence) ? word.confidence : 0,
      ),
    ),
  }
}

function integer(words: readonly Word[]) {
  const digits = words
    .map((word) => word.text)
    .join('')
    .replace(/\D/g, '')
  const value = Number(digits)
  return digits && Number.isSafeInteger(value) ? value : undefined
}

function integerRuns(row: readonly Word[], height: number) {
  const runs: Word[][] = []
  let current: Word[] = []
  for (const word of row) {
    if (!/^[\d.,\s]+$/.test(word.text)) {
      current = []
      continue
    }
    const previous = current.at(-1)
    if (previous && word.bbox.x0 - previous.bbox.x1 <= height / 2) {
      current.push(word)
    } else if (/\d/.test(word.text)) {
      current = [word]
      runs.push(current)
    }
  }
  return runs
}

export function parseDialog(words: readonly Word[]): ParsedDialog {
  const parsed: ParsedDialog = { isMarketDialog: false, tiers: {} }
  const rows = groupWordRows(words)
  const packRow = rows.find(
    (row) =>
      row.some((word) => /^pack$/i.test(word.text)) &&
      row.some((word) => /^price$/i.test(word.text)),
  )
  if (!packRow) return parsed
  const packBounds = wordBounds(packRow)
  const averageRow = rows.findLast(
    (row) =>
      wordBounds(row).y1 < packBounds.y0 &&
      /\baverage\s+price\b/i.test(row.map((word) => word.text).join(' ')),
  )
  if (!averageRow) return parsed
  parsed.isMarketDialog = true
  const height = medianWordHeight(words)
  const metaRow = rows.findLast(
    (row) =>
      wordBounds(row).y1 <= wordBounds(averageRow).y0 &&
      /\bLv[l1i]?\.?\s*\d+/i.test(row.map((word) => word.text).join(' ')),
  )
  let titleLeft =
    averageRow.find((word) => /^average$/i.test(word.text))?.bbox.x0 ??
    wordBounds(averageRow).x0
  if (metaRow) {
    const markerIndex = metaRow.findIndex((word) =>
      /\bLv[l1i]?\.?/i.test(word.text),
    )
    const marker = metaRow[markerIndex]
    titleLeft = marker.bbox.x0
    const levelIndex = /\d/.test(marker.text) ? markerIndex : markerIndex + 1
    const levelWord = metaRow[levelIndex]
    const level = levelWord ? integer([levelWord]) : undefined
    if (level !== undefined) parsed.level = field(level, [levelWord])
    const typeWords = metaRow
      .slice(levelIndex + 1)
      .filter((word) => /[a-z]{2}/i.test(word.text))
    if (typeWords.length)
      parsed.type = field(
        typeWords.map((word) => word.text).join(' '),
        typeWords,
      )
  }
  const titleCeiling = wordBounds(metaRow ?? averageRow).y0
  const titleRow = rows.findLast(
    (row) =>
      wordBounds(row).y1 <= titleCeiling &&
      row.some((word) => word.bbox.y1 - word.bbox.y0 > height * 1.02),
  )
  const titleWords = titleRow?.filter(
    (word) =>
      word.bbox.x0 >= titleLeft - height / 2 && /[a-z0-9]/i.test(word.text),
  )
  if (titleWords?.length)
    parsed.title = field(
      titleWords.map((word) => word.text).join(' '),
      titleWords,
    )

  const priceLabel = averageRow.findIndex((word) =>
    /^price:?$/i.test(word.text),
  )
  const averageWords: Word[] = []
  for (const word of averageRow.slice(priceLabel + 1)) {
    if (!/^\d/.test(word.text)) {
      if (averageWords.length) break
      continue
    }
    const previous = averageWords.at(-1)
    if (previous && word.bbox.x0 - previous.bbox.x1 > height / 2) break
    averageWords.push(word)
  }
  const averagePrice = integer(averageWords)
  if (averagePrice !== undefined)
    parsed.averagePrice = field(averagePrice, averageWords)

  for (const row of rows) {
    const bounds = wordBounds(row)
    if (bounds.y0 <= packBounds.y1) continue
    const runs = integerRuns(row, height)
    if (runs.length !== 2) continue
    const [tierWords, priceWords] = runs
    const tier = integer(tierWords) as PackTier | undefined
    const packPrice = integer(priceWords)
    const tierBounds = wordBounds(tierWords)
    const priceBounds = wordBounds(priceWords)
    const midpoint = (bounds.x0 + bounds.x1) / 2
    if (
      tier === undefined ||
      !PACK_TIERS.includes(tier) ||
      packPrice === undefined ||
      packPrice <= 0 ||
      parsed.tiers[tier] ||
      (tierBounds.x0 + tierBounds.x1) / 2 >= midpoint ||
      (priceBounds.x0 + priceBounds.x1) / 2 <= midpoint
    )
      continue
    parsed.tiers[tier] = field(packPrice, [...tierWords, ...priceWords])
  }
  return parsed
}
