#!/usr/bin/env node
// git pre-commit hook을 .githooks/ 로 향하게 설정 (core.hooksPath)
import { execSync } from 'node:child_process'
import { chmodSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const hook = join(root, '.githooks', 'pre-commit')
if (!existsSync(hook)) {
  console.error('missing .githooks/pre-commit')
  process.exit(1)
}
try { chmodSync(hook, 0o755) } catch {}
execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'inherit' })
console.log('installed: core.hooksPath -> .githooks (pre-commit checks mirror freshness)')
