// Retakes the marketing and manifest screenshots from the running dev server.
// Usage: npm run dev, then `npm run capture:screenshots`.

import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/screenshots')
const BASE = process.env.KAMARGIN_URL ?? 'http://localhost:5173/kamargin/'
const CHROME =
  process.env.CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** The subject of both shots: a five-ingredient Shoemaker recipe. */
const SUBJECT = 910
const SERVER = 355

const SHOTS = [
  {
    file: 'craft-cost.png',
    hash: `#/cost?server=${SERVER}&item=${SUBJECT}`,
    width: 1440,
    height: 1080,
    formFactor: 'wide',
    ready: 'table tbody tr',
  },
  {
    file: 'what-to-craft.png',
    hash: `#/crafts?server=${SERVER}`,
    width: 1440,
    height: 1080,
    formFactor: 'wide',
    ready: 'table tbody tr',
  },
  {
    file: 'craft-cost-narrow.png',
    hash: `#/cost?server=${SERVER}&item=${SUBJECT}`,
    width: 412,
    height: 900,
    formFactor: 'narrow',
    ready: 'table tbody tr',
  },
]

// Prices are invented, not observed — the same seed every run, so a retake is a clean diff.
const SEED = `async (server, subject) => {
  const gameData = await import('/kamargin/src/lib/game-data.ts')
  const priceFor = (itemId, level) => {
    let hash = itemId * 2654435761 % 2147483647
    hash = (hash ^ (hash >>> 13)) >>> 0
    const band = 40 + (level || 1) * 9
    return Math.round(band * (0.55 + (hash % 1000) / 1000) / 5) * 5
  }
  const book = {}
  const price = (itemId) => {
    if (book[itemId]) return
    const item = gameData.getItem(itemId)
    if (!item) return
    const unit = priceFor(itemId, item.level)
    book[itemId] = {
      serverId: server,
      itemId,
      tiers: {
        1: { packPrice: unit, capturedAt: Date.now() },
        10: { packPrice: Math.round(unit * 9.4), capturedAt: Date.now() },
        100: { packPrice: Math.round(unit * 88), capturedAt: Date.now() },
      },
    }
  }
  const shoemaker = gameData
    .getCraftableItems()
    .filter((entry) => gameData.getJobName(entry.job) === 'Shoemaker')
  const ranked = shoemaker.slice(0, 60)
  const target = shoemaker.find((entry) => entry.id === subject)
  if (target && !ranked.includes(target)) ranked.push(target)
  for (const entry of ranked) for (const line of entry.recipe) price(line.itemId)

  // Without a sale price nothing ranks, and the screen's whole point is the ranking.
  const unitOf = (itemId) => {
    const tiers = book[itemId]?.tiers
    if (!tiers) return undefined
    return Math.min(
      ...Object.entries(tiers).map(([tier, row]) => row.packPrice / Number(tier)),
    )
  }
  for (const entry of ranked) {
    let cost = 0
    for (const line of entry.recipe) {
      const unit = unitOf(line.itemId)
      if (unit === undefined) { cost = 0; break }
      cost += unit * line.quantity
    }
    if (!cost) continue
    let hash = (entry.id * 1103515245 + 12345) % 2147483647
    hash = (hash ^ (hash >>> 15)) >>> 0
    const factor = 0.85 + (hash % 1600) / 1000
    book[entry.id] = {
      serverId: server,
      itemId: entry.id,
      tiers: {
        1: { packPrice: Math.round((cost * factor) / 10) * 10, capturedAt: Date.now() },
      },
    }
  }
  localStorage.setItem('prices:' + server, JSON.stringify(book))
  localStorage.setItem('serverId', String(server))
  localStorage.setItem('theme', '"dark"')
  localStorage.removeItem('watchlist:' + server)
  localStorage.removeItem('snapshots:' + server)
  return Object.keys(book).length
}`

function chromeArgs(port, profile) {
  return [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    'about:blank',
  ]
}

async function connect(port) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(
        (response) => response.json(),
      )
      const page = targets.find((target) => target.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {}
    await new Promise((done) => setTimeout(done, 250))
  }
  throw new Error('Chrome never exposed a debuggable page.')
}

function client(socket) {
  let nextId = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const waiting = pending.get(message.id)
    if (!waiting) return
    pending.delete(message.id)
    if (message.error) waiting.reject(new Error(message.error.message))
    else waiting.resolve(message.result)
  })
  return (method, params = {}) =>
    new Promise((resolve_, reject) => {
      const id = ++nextId
      pending.set(id, { resolve: resolve_, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
}

async function evaluate(send, expression, awaitPromise = true) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  })
  if (exceptionDetails)
    throw new Error(
      exceptionDetails.exception?.description ?? 'evaluate failed',
    )
  return result.value
}

async function settle(send, selector) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const ready = await evaluate(
      send,
      `!!document.querySelector(${JSON.stringify(selector)})`,
      false,
    )
    if (ready) {
      // One more frame so icons and the sticky header have painted.
      await new Promise((done) => setTimeout(done, 400))
      return
    }
    await new Promise((done) => setTimeout(done, 250))
  }
  throw new Error(`Timed out waiting for ${selector}`)
}

const port = 9333 + (process.pid % 500)
const profile = await mkdtemp(join(tmpdir(), 'kamargin-shots-'))
await mkdir(OUT, { recursive: true })

const chrome = spawn(CHROME, chromeArgs(port, profile), { stdio: 'ignore' })
let socket
try {
  const endpoint = await connect(port)
  socket = new WebSocket(endpoint)
  await new Promise((ready, failed) => {
    socket.addEventListener('open', ready, { once: true })
    socket.addEventListener('error', failed, { once: true })
  })
  const send = client(socket)
  await send('Page.enable')
  await send('Runtime.enable')

  await send('Page.navigate', { url: BASE })
  await settle(send, '#root')
  const priced = await evaluate(send, `(${SEED})(${SERVER}, ${SUBJECT})`)
  console.log(`Seeded ${priced} invented prices on server ${SERVER}.`)

  for (const shot of SHOTS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: 2,
      mobile: shot.formFactor === 'narrow',
    })
    await send('Page.navigate', { url: `${BASE}${shot.hash}` })
    await settle(send, shot.ready)
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(resolve(OUT, shot.file), Buffer.from(data, 'base64'))
    console.log(
      `${shot.file}  ${shot.width * 2}x${shot.height * 2}  ${shot.formFactor}`,
    )
  }
} finally {
  socket?.close()
  chrome.kill()
  // Chrome finishes writing its profile after the kill; a failed sweep is not a failed capture.
  await rm(profile, { recursive: true, force: true, maxRetries: 10 }).catch(
    () => {},
  )
}
