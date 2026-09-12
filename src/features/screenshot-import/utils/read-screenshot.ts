import { type Page, PSM, type Worker } from 'tesseract.js'

import type { OcrReading, Word } from '../types'
import { locateDialog } from './locate-dialog'
import { parseDialog } from './parse-dialog'

function wordsFrom(page: Page): Word[] {
  return (page.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) =>
        line.words.map(({ text, bbox, confidence }) => ({
          text,
          bbox,
          confidence,
        })),
      ),
    ),
  )
}

export async function readScreenshot(
  worker: Pick<Worker, 'recognize' | 'setParameters'>,
  image: File,
  signal: AbortSignal,
  onPhase: (phase: string) => void,
): Promise<OcrReading> {
  signal.throwIfAborted()
  const bitmap = await createImageBitmap(image)
  const size = { width: bitmap.width, height: bitmap.height }
  const canvas = document.createElement('canvas')
  try {
    signal.throwIfAborted()
    const scale = Math.min(1, 2400 / Math.max(size.width, size.height))
    canvas.width = Math.round(size.width * scale)
    canvas.height = Math.round(size.height * scale)
    const context = canvas.getContext('2d')
    if (!context)
      throw new Error('This browser could not decode the screenshot.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    onPhase('Locating dialog')
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      tessedit_char_whitelist: '',
    })
    signal.throwIfAborted()
    const locateResult = await worker.recognize(canvas, {}, { blocks: true })
    signal.throwIfAborted()
    let words = wordsFrom(locateResult.data).map((word) => ({
      ...word,
      bbox: {
        x0: word.bbox.x0 / scale,
        y0: word.bbox.y0 / scale,
        x1: word.bbox.x1 / scale,
        y1: word.bbox.y1 / scale,
      },
    }))
    let location = locateDialog(words, size)
    if (!location.confident && scale < 1) {
      words = wordsFrom(
        (await worker.recognize(image, {}, { blocks: true })).data,
      )
      signal.throwIfAborted()
      location = locateDialog(words, size)
    }
    if (!location.priceBand) {
      return { ...size, location, parsed: parseDialog([]) }
    }

    onPhase('Reading item')
    const headerResult = await worker.recognize(
      image,
      { rectangle: location.crop },
      { blocks: true },
    )
    signal.throwIfAborted()
    const priceBand = location.priceBand
    const header = wordsFrom(headerResult.data).filter(
      (word) => word.bbox.y1 <= priceBand.top,
    )
    onPhase('Reading prices')
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: '0123456789,.',
    })
    signal.throwIfAborted()
    const prices = await worker.recognize(
      image,
      { rectangle: priceBand },
      { blocks: true },
    )
    signal.throwIfAborted()
    return {
      ...size,
      location,
      parsed: parseDialog([...header, ...wordsFrom(prices.data)]),
    }
  } finally {
    bitmap.close()
    canvas.width = 0
    canvas.height = 0
  }
}
