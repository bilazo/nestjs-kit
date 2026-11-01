import { globSync } from 'node:fs'

import { defineConfig } from 'tsdown'

// Build an explicit entry map so tsdown preserves the full path structure
// (instead of flattening to a common base directory).
const entry: Record<string, string> = {}
for (const file of globSync('src/**/*.ts')) {
  const normalized = file.replaceAll('\\', '/')
  if (normalized.endsWith('.spec.ts')) continue
  if (normalized.endsWith('.d.ts')) continue
  const name = normalized.replace(/^src\//u, '').replace(/\.ts$/u, '')
  entry[name] = normalized
}

export default defineConfig({
  entry,
  unbundle: true,
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2024',
  publint: true,
  deps: {
    neverBundle: ['@nestjs/common', '@nestjs/core', 'reflect-metadata', 'rxjs'],
  },
})
