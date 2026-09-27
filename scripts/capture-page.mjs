import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'

const [url, output = '.visual-check/page.png', widthArg = '1440', heightArg = '1000', setupBase64 = ''] = process.argv.slice(2)
if (!url) throw new Error('Utilizare: node scripts/capture-page.mjs <url> <output> [width] [height]')

const width = Number(widthArg)
const height = Number(heightArg)
const edgePath = process.platform === 'win32'
  ? `${process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)'}\\Microsoft\\Edge\\Application\\msedge.exe`
  : 'microsoft-edge'
const port = 9300 + (process.pid % 500)
const profile = resolve(tmpdir(), `economia-games-audit-${process.pid}`)
const browser = spawn(edgePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds))

async function getTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json())
      const target = targets.find((item) => item.type === 'page')
      if (target) return target
    } catch {
      // Browserul încă pornește.
    }
    await wait(100)
  }
  throw new Error('Nu s-a putut deschide sesiunea de audit Edge.')
}

try {
  const target = await getTarget()
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true })
    socket.addEventListener('error', rejectOpen, { once: true })
  })
  let messageId = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data))
    if (!message.id || !pending.has(message.id)) return
    const { resolveResult, rejectResult } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) rejectResult(new Error(message.error.message))
    else resolveResult(message.result)
  })
  const command = (method, params = {}) => new Promise((resolveResult, rejectResult) => {
    messageId += 1
    pending.set(messageId, { resolveResult, rejectResult })
    socket.send(JSON.stringify({ id: messageId, method, params }))
  })

  await command('Page.enable')
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 740 })
  await command('Page.navigate', { url })
  await wait(setupBase64 ? 1600 : 5500)
  if (setupBase64) {
    await command('Runtime.evaluate', {
      expression: Buffer.from(setupBase64, 'base64').toString('utf8'),
      awaitPromise: true,
      returnByValue: true,
    })
    await wait(2600)
  }
  const metrics = await command('Runtime.evaluate', {
    expression: `JSON.stringify({innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,title:document.title})`,
    returnByValue: true,
  })
  const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const targetPath = resolve(output)
  await mkdir(dirname(targetPath), { recursive: true })
  await writeFile(targetPath, Buffer.from(screenshot.data, 'base64'))
  process.stdout.write(`${metrics.result.value}\n${targetPath}\n`)
  socket.close()
} finally {
  browser.kill()
}
