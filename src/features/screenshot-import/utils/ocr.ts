import { createWorker, type WorkerOptions } from 'tesseract.js'

import engine from '../assets/engine.json'

let cacheReady: Promise<void> | undefined

async function enableAssetCache() {
  if (!('serviceWorker' in navigator) || !('caches' in globalThis)) {
    throw new Error('This browser cannot store the offline OCR engine.')
  }
  const base = import.meta.env.BASE_URL
  const script = new URL(
    `${base}ocr-cache-worker.js?v=${engine.cacheVersion}`,
    location.href,
  )
  await navigator.serviceWorker.register(script, {
    scope: base,
    updateViaCache: 'none',
  })
  if (navigator.serviceWorker.controller?.scriptURL === script.href) return
  await new Promise<void>((resolve, reject) => {
    const controllerChanged = () => {
      if (navigator.serviceWorker.controller?.scriptURL !== script.href) return
      clearTimeout(timer)
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        controllerChanged,
      )
      resolve()
    }
    const timer = setTimeout(() => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        controllerChanged,
      )
      reject(new Error('The offline OCR cache could not start. Please retry.'))
    }, 15_000)
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      controllerChanged,
    )
    controllerChanged()
  })
}

export async function createOcrWorker(
  options: Partial<Pick<WorkerOptions, 'logger' | 'errorHandler'>> = {},
) {
  cacheReady ??= enableAssetCache().catch((error) => {
    cacheReady = undefined
    throw error
  })
  await cacheReady
  const base = import.meta.env.BASE_URL
  return createWorker('eng', 1, {
    ...options,
    workerPath: `${base}ocr/worker.min.js`,
    workerBlobURL: false,
    corePath: `${base}ocr/core`,
    langPath: `${base}ocr`,
    cachePath: `kamargin-ocr-${engine.languageSha256}`,
    gzip: false,
    cacheMethod: 'write',
  })
}
