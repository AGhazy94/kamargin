import type { Item } from '@/types/game'

import {
  type ItemMatch,
  OCR_CONFIDENCE_THRESHOLD,
  type ParsedDialog,
} from '../types'

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

function editDistance(first: string, second: string) {
  if (Math.abs(first.length - second.length) > 2) return 3
  let previous = Array.from({ length: second.length + 1 }, (_, index) => index)
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex++) {
    const current = [firstIndex]
    let smallest = firstIndex
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex++) {
      const distance = Math.min(
        previous[secondIndex] + 1,
        current[secondIndex - 1] + 1,
        previous[secondIndex - 1] +
          (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
      )
      current.push(distance)
      smallest = Math.min(smallest, distance)
    }
    if (smallest > 2) return 3
    previous = current
  }
  return previous[second.length]
}

export function matchItem(
  dialog: ParsedDialog,
  items: readonly Item[],
): ItemMatch {
  if (!dialog.isMarketDialog || !dialog.title)
    return { candidates: [], confident: false }
  const title = normalize(dialog.title.value)
  if (!title) return { candidates: [], confident: false }
  const type = dialog.type ? normalize(dialog.type.value) : undefined
  const candidates: ItemMatch['candidates'] = []
  for (const item of items) {
    const distance = editDistance(title, normalize(item.name))
    if (distance > 2) continue
    const score =
      distance +
      (dialog.level && dialog.level.value !== item.level ? 1 : 0) +
      (type && type !== normalize(item.type) ? 1 : 0)
    candidates.push({ item, distance, score })
  }
  candidates.sort(
    (first, second) =>
      first.score - second.score ||
      first.distance - second.distance ||
      first.item.id - second.item.id,
  )
  const best = candidates[0]
  const runnerUp = candidates[1]
  const confident = Boolean(
    best &&
      dialog.title.confidence >= OCR_CONFIDENCE_THRESHOLD &&
      (!runnerUp || best.score < runnerUp.score) &&
      (!dialog.level || dialog.level.value === best.item.level) &&
      (!type || type === normalize(best.item.type)),
  )
  return { candidates, confident, itemId: confident ? best.item.id : undefined }
}
