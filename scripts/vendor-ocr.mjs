import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import workerPackage from 'tesseract.js/package.json' with { type: 'json' }
import corePackage from 'tesseract.js-core/package.json' with { type: 'json' }

const check = process.argv.includes('--check')
const destination = new URL('../public/ocr/', import.meta.url)
const workerRoot = new URL(
  '.',
  import.meta.resolve('tesseract.js/package.json'),
)
const coreRoot = new URL(
  '.',
  import.meta.resolve('tesseract.js-core/package.json'),
)
const revision = '87416418657359cb625c412a48b6e1d6d41c29bd'
const languageSource = `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/${revision}`
const languageSha256 =
  '7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2'
const coreFiles = (await readdir(coreRoot))
  .filter((name) => name.endsWith('-lstm.wasm.js'))
  .sort()
assert.ok(coreFiles.length > 0, 'No LSTM cores found in tesseract.js-core')

const sources = [
  ['../ocr-cache-worker.js', new URL('./ocr-cache-worker.js', import.meta.url)],
  ['worker.min.js', new URL('dist/worker.min.js', workerRoot)],
  [
    'worker.min.js.LICENSE.txt',
    new URL('dist/worker.min.js.LICENSE.txt', workerRoot),
  ],
  ['licenses/tesseract.js.txt', new URL('LICENSE.md', workerRoot)],
  ['licenses/tesseract.js-core.txt', new URL('LICENSE', coreRoot)],
  ...coreFiles.map((name) => [`core/${name}`, new URL(name, coreRoot)]),
]
const files = {}

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex')
}

async function writeVerified(target, contents) {
  if (check) {
    assert.deepEqual(
      await readFile(target),
      contents,
      `${target.pathname} is stale; run npm run generate:ocr-assets`,
    )
  } else {
    await mkdir(new URL('.', target), { recursive: true })
    await writeFile(target, contents)
  }
}

async function writeAsset(name, contents) {
  await writeVerified(new URL(name, destination), contents)
  files[name] = { bytes: contents.length, sha256: sha256(contents) }
}

async function languageAsset(name, remoteName, expectedHash) {
  let contents = await readFile(new URL(name, destination)).catch(() => null)
  if (!contents || (expectedHash && sha256(contents) !== expectedHash)) {
    assert.ok(
      !check,
      `${name} is missing or invalid; run npm run generate:ocr-assets`,
    )
    const response = await fetch(`${languageSource}/${remoteName}`)
    assert.ok(
      response.ok,
      `Could not download ${remoteName}: ${response.status}`,
    )
    contents = Buffer.from(await response.arrayBuffer())
  }
  if (expectedHash) assert.equal(sha256(contents), expectedHash, name)
  await writeAsset(name, contents)
}

for (const [name, source] of sources) {
  await writeAsset(name, await readFile(source))
}
await languageAsset('eng.traineddata', 'eng.traineddata', languageSha256)
await languageAsset('licenses/tessdata_fast.txt', 'LICENSE')

const manifest = {
  workerVersion: workerPackage.version,
  coreVersion: corePackage.version,
  language: { repository: 'tesseract-ocr/tessdata_fast', revision },
  maxBrowserBytes:
    files['../ocr-cache-worker.js'].bytes +
    files['worker.min.js'].bytes +
    files['eng.traineddata'].bytes +
    Math.max(...coreFiles.map((name) => files[`core/${name}`].bytes)),
  files,
}
const serialized = `${JSON.stringify(manifest, null, 2)}\n`
const manifestPath = new URL('manifest.json', destination)
await writeVerified(manifestPath, Buffer.from(serialized))
await writeVerified(
  new URL(
    '../src/features/screenshot-import/assets/engine.json',
    import.meta.url,
  ),
  Buffer.from(
    `${JSON.stringify(
      {
        cacheVersion: sha256(Buffer.from(serialized)),
        languageSha256,
        downloadBytes: manifest.maxBrowserBytes,
      },
      null,
      2,
    )}\n`,
  ),
)

console.table(
  Object.entries(files).map(([name, asset]) => ({
    file: name,
    bytes: asset.bytes,
  })),
)
console.log(`Maximum first-import payload: ${manifest.maxBrowserBytes} bytes`)
console.log(
  check ? 'Vendored OCR assets verified.' : 'Vendored OCR assets generated.',
)
