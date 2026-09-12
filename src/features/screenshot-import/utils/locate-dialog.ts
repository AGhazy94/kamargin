import { PACK_TIERS } from '@/utils/pack-tiers'

import {
  type DialogLocation,
  OCR_CONFIDENCE_THRESHOLD,
  type Word,
} from '../types'
import { groupWordRows, medianWordHeight } from './parse-dialog'

export function locateDialog(
  words: readonly Word[],
  size: { width: number; height: number },
): DialogLocation {
  const ordered = groupWordRows(words).flat()
  const candidates: DialogLocation[] = []
  for (const pack of ordered.filter((word) => /^pack$/i.test(word.text))) {
    const packHeight = pack.bbox.y1 - pack.bbox.y0
    const price = ordered
      .filter(
        (word) =>
          /^price$/i.test(word.text) &&
          word.bbox.x0 > pack.bbox.x1 &&
          Math.abs(word.bbox.y0 - pack.bbox.y0) < packHeight,
      )
      .sort((first, second) => first.bbox.x0 - second.bbox.x0)[0]
    if (!price) continue
    const height = medianWordHeight([pack, price])
    const average = ordered
      .filter(
        (word) =>
          /^average$/i.test(word.text) &&
          word.bbox.x0 >= pack.bbox.x0 &&
          word.bbox.x0 < price.bbox.x0 &&
          word.bbox.y1 < pack.bbox.y0 &&
          pack.bbox.y0 - word.bbox.y0 < height * 16,
      )
      .sort((first, second) => second.bbox.y0 - first.bbox.y0)[0]
    if (!average) continue

    const priceCenter = (price.bbox.x0 + price.bbox.x1) / 2
    const midpoint = ((pack.bbox.x0 + pack.bbox.x1) / 2 + priceCenter) / 2
    const numbers = ordered
      .filter((word) => {
        const center = (word.bbox.x0 + word.bbox.x1) / 2
        return (
          /^\d[\d,.\s]*$/.test(word.text) &&
          center > midpoint &&
          center <= priceCenter &&
          word.bbox.x1 <= price.bbox.x1 &&
          word.bbox.y0 > pack.bbox.y1 &&
          word.bbox.y1 < pack.bbox.y1 + height * 40
        )
      })
      .sort((first, second) => first.bbox.y0 - second.bbox.y0)
    const packCenter = (pack.bbox.x0 + pack.bbox.x1) / 2
    const tierWords = ordered.filter(
      (word) =>
        /^\d[\d,.\s]*$/.test(word.text) &&
        PACK_TIERS.some(
          (tier) => tier === Number(word.text.replace(/\D/g, '')),
        ) &&
        Math.abs((word.bbox.x0 + word.bbox.x1) / 2 - packCenter) < height * 2 &&
        word.bbox.y0 > pack.bbox.y1 &&
        word.bbox.y1 < pack.bbox.y1 + height * 40,
    )
    const buyWords = ordered.filter(
      (word) =>
        /^(?:buy|bu)$/i.test(word.text) &&
        word.bbox.x0 > price.bbox.x1 &&
        word.bbox.x1 < price.bbox.x1 + height * 12 &&
        word.bbox.y0 > pack.bbox.y1 &&
        word.bbox.y1 < pack.bbox.y1 + height * 40,
    )
    const markers = [...numbers, ...tierWords, ...buyWords].sort(
      (first, second) => first.bbox.y0 - second.bbox.y0,
    )
    const priceWords: Word[] = []
    let previousBottom = pack.bbox.y1
    for (const word of markers) {
      if (word.bbox.y0 - previousBottom > height * 8) break
      if (numbers.includes(word)) priceWords.push(word)
      previousBottom = Math.max(previousBottom, word.bbox.y1)
    }
    const left = Math.max(0, Math.floor(pack.bbox.x0 - height * 5))
    const top = Math.max(0, Math.floor(average.bbox.y0 - height * 5))
    const right = Math.min(size.width, Math.ceil(price.bbox.x1 + height * 12))
    const bottom = Math.min(
      size.height,
      Math.ceil(
        priceWords.length
          ? previousBottom + height
          : pack.bbox.y1 + height * 20,
      ),
    )
    const candidate: DialogLocation = {
      crop: { left, top, width: right - left, height: bottom - top },
      confident:
        priceWords.length > 0 &&
        [pack, price, average].every(
          (word) => word.confidence >= OCR_CONFIDENCE_THRESHOLD,
        ),
    }
    if (priceWords.length) {
      const priceTop = Math.floor(pack.bbox.y1 + height / 6)
      const priceRight = Math.min(
        size.width,
        Math.ceil(
          Math.max(...priceWords.map((word) => word.bbox.x1)) + height / 3,
        ),
      )
      candidate.priceBand = {
        left: pack.bbox.x0,
        top: priceTop,
        width: priceRight - pack.bbox.x0,
        height: bottom - priceTop,
      }
    }
    candidates.push(candidate)
  }
  const best =
    candidates.find((candidate) => candidate.confident) ?? candidates[0]
  return best
    ? { ...best, confident: candidates.length === 1 && best.confident }
    : {
        crop: { left: 0, top: 0, width: size.width, height: size.height },
        confident: false,
      }
}
