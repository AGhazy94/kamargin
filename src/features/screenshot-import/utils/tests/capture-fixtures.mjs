import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createWorker, PSM } from 'tesseract.js'

const [directory, ...selectedFiles] = process.argv.slice(2)
assert.ok(directory, 'Pass the directory containing original PNG screenshots')
const sourceDirectory = resolve(directory)
const destination = new URL('./fixtures/', import.meta.url)
const assets = resolve('public/ocr')
const manifest = JSON.parse(await readFile(`${assets}/manifest.json`, 'utf8'))
const filenames = selectedFiles.length
  ? selectedFiles
  : (await readdir(sourceDirectory))
      .filter((name) => name.endsWith('.png'))
      .sort()
const anchorPattern = /^(?:average|price:?|pack|buy|bu|y)$/i
const worker = await createWorker('eng', 1, {
  langPath: assets,
  gzip: false,
  cacheMethod: 'none',
})

function wordsFrom(data) {
  return (data.blocks ?? []).flatMap((block) =>
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

function captureRegions(words, width, height) {
  const pack = words.find((word) => /^pack$/i.test(word.text))
  if (!pack) return null
  const lineHeight = pack.bbox.y1 - pack.bbox.y0
  const price = words.find(
    (word) =>
      /^price$/i.test(word.text) &&
      word.bbox.x0 > pack.bbox.x1 &&
      Math.abs(word.bbox.y0 - pack.bbox.y0) < lineHeight,
  )
  if (!price) return null
  const average = words
    .filter(
      (word) =>
        /^average$/i.test(word.text) &&
        word.bbox.y0 < pack.bbox.y0 &&
        word.bbox.x0 >= pack.bbox.x0 &&
        word.bbox.x0 < price.bbox.x0,
    )
    .sort((first, second) => second.bbox.y0 - first.bbox.y0)[0]
  if (!average) return null
  const priceWords = words.filter(
    (word) =>
      /^\d[\d,. ]*$/.test(word.text) &&
      word.text.replace(/\D/g, '').length >= 3 &&
      word.bbox.x0 > (pack.bbox.x1 + price.bbox.x0) / 2 &&
      word.bbox.x1 <= price.bbox.x1 &&
      word.bbox.y0 > pack.bbox.y1 &&
      word.bbox.y1 < pack.bbox.y1 + lineHeight * 28,
  )
  if (!priceWords.length) return null
  const buyWords = words.filter(
    (word) =>
      /^(?:buy|bu)$/i.test(word.text) &&
      word.bbox.x0 > price.bbox.x1 &&
      word.bbox.x1 < price.bbox.x1 + lineHeight * 12 &&
      word.bbox.y0 > pack.bbox.y1 &&
      word.bbox.y1 < pack.bbox.y1 + lineHeight * 28,
  )
  const left = Math.max(0, pack.bbox.x0 - lineHeight * 5)
  const top = Math.max(0, average.bbox.y0 - lineHeight * 5)
  const bottom = Math.min(
    height,
    Math.max(...[...priceWords, ...buyWords].map((word) => word.bbox.y1)) +
      lineHeight,
  )
  const priceTop = pack.bbox.y1 + 4
  return {
    crop: {
      left,
      top,
      width: Math.min(width, price.bbox.x1 + lineHeight * 12) - left,
      height: bottom - top,
    },
    priceBand: {
      left: pack.bbox.x0,
      top: priceTop,
      width:
        Math.max(...priceWords.map((word) => word.bbox.x1)) +
        lineHeight / 3 -
        pack.bbox.x0,
      height: bottom - priceTop,
    },
  }
}

try {
  await mkdir(destination, { recursive: true })
  for (const filename of filenames) {
    const image = await readFile(resolve(sourceDirectory, filename))
    assert.equal(image.subarray(1, 4).toString(), 'PNG', filename)
    const width = image.readUInt32BE(16)
    const height = image.readUInt32BE(20)
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      tessedit_char_whitelist: '',
    })
    const scan = wordsFrom(
      (await worker.recognize(image, {}, { blocks: true })).data,
    )
    const regions = captureRegions(scan, width, height)
    let words = scan
    let locateWords = scan
    let priceWords = []
    if (regions) {
      const { crop, priceBand } = regions
      const reading = await worker.recognize(
        image,
        { rectangle: crop },
        { blocks: true },
      )
      const header = wordsFrom(reading.data).filter(
        (word) => word.bbox.y1 <= priceBand.top,
      )
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: '0123456789,.',
      })
      priceWords = wordsFrom(
        (
          await worker.recognize(
            image,
            { rectangle: priceBand },
            { blocks: true },
          )
        ).data,
      )
      words = [...header, ...priceWords]
      locateWords = scan.filter(
        (word) =>
          anchorPattern.test(word.text) ||
          (word.bbox.x0 >= crop.left &&
            word.bbox.x1 <= crop.left + crop.width &&
            word.bbox.y0 >= crop.top &&
            word.bbox.y1 <= crop.top + crop.height),
      )
    }
    const fixture = {
      source: {
        filename,
        sha256: createHash('sha256').update(image).digest('hex'),
        width,
        height,
      },
      engine: {
        workerVersion: manifest.workerVersion,
        coreVersion: manifest.coreVersion,
        languageSha256: manifest.files['eng.traineddata'].sha256,
      },
      ...regions,
      locateWords,
      words,
    }
    const name = filename
      .replace(/\.png$/, '')
      .replace(/[^a-z0-9.-]+/gi, '-')
      .toLowerCase()
    await writeFile(
      new URL(`${name}.json`, destination),
      `${JSON.stringify(fixture, null, 2)}\n`,
    )
    console.log(
      `${name}: ${width}x${height}; ${regions ? priceWords.map((word) => word.text).join(' ') : 'not a market dialog'}`,
    )
  }
} finally {
  await worker.terminate()
}
