// Browser tests: starts the app's dev server, then runs each flow in e2e/flows/ in headless
// Google Chrome (via playwright-core, which uses your installed Chrome — no browser download).
// Each flow gets a fresh browser profile, so it starts with an empty database.
//
//   npm run e2e                 run every flow
//   npm run e2e -- homebrew     run flows whose file name contains "homebrew"
//   SHOW=1 npm run e2e          watch it in a visible Chrome window
//
// Screenshots are saved to e2e/screenshots/ (ignored by git).

import { mkdir } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'

const root = new URL('..', import.meta.url).pathname
const flowsDir = new URL('./flows/', import.meta.url)
const shotsDir = new URL('./screenshots/', import.meta.url).pathname
await mkdir(shotsDir, { recursive: true })

// Start Vite on a free port (5180 or the next one available).
const server = await createServer({ root, logLevel: 'error', server: { port: 5180 } })
await server.listen()
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

const filter = process.argv[2] ?? ''
const files = (await readdir(flowsDir)).filter((f) => f.endsWith('.mjs') && f.includes(filter)).sort()
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.SHOW })

let failed = 0
for (const file of files) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  const page = await context.newPage()
  // Any error in the browser console fails the flow.
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('dialog', (d) => d.accept())  // say OK to every confirm()
  page.setDefaultTimeout(10_000)

  const started = Date.now()
  try {
    const { default: flow } = await import(new URL(file, flowsDir))
    await flow({ page, base, shot: (name) => page.screenshot({ path: `${shotsDir}${name}.png`, fullPage: true }), shotsDir })
    if (errors.length) throw new Error(`Browser console errors:\n  ${errors.join('\n  ')}`)
    console.log(`✓ ${file} (${((Date.now() - started) / 1000).toFixed(1)}s)`)
  } catch (e) {
    failed++
    console.log(`✗ ${file}\n  ${String(e.stack ?? e).split('\n').slice(0, 6).join('\n  ')}`)
    await page.screenshot({ path: `${shotsDir}FAILED-${file.replace('.mjs', '')}.png`, fullPage: true }).catch(() => {})
  }
  await context.close()
}

await browser.close()
await server.close()
console.log(failed ? `\n${failed} of ${files.length} flows failed` : `\nAll ${files.length} flows passed`)
process.exit(failed ? 1 : 0)
