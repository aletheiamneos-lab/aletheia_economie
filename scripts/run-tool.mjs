import { existsSync, lstatSync, readlinkSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const aliasRoot = join(tmpdir(), 'economia-aplicatie-vite-root')
const [tool = 'vite', ...toolArgs] = process.argv.slice(2)

const entryPoints = {
  vite: join('node_modules', 'vite', 'bin', 'vite.js'),
  vitest: join('node_modules', 'vitest', 'vitest.mjs'),
}

if (!(tool in entryPoints)) {
  throw new Error(`Instrument necunoscut: ${tool}`)
}

if (existsSync(aliasRoot)) {
  const stats = lstatSync(aliasRoot)
  if (!stats.isSymbolicLink()) {
    throw new Error(`Calea temporară există și nu este link: ${aliasRoot}`)
  }
  const currentTarget = resolve(dirname(aliasRoot), readlinkSync(aliasRoot))
  if (currentTarget !== projectRoot) rmSync(aliasRoot)
}

if (!existsSync(aliasRoot)) {
  symlinkSync(projectRoot, aliasRoot, process.platform === 'win32' ? 'junction' : 'dir')
}

const child = spawn(process.execPath, [join(aliasRoot, entryPoints[tool]), ...toolArgs], {
  cwd: aliasRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --preserve-symlinks --preserve-symlinks-main`.trim(),
  },
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
