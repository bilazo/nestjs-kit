import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.spec.ts'],
  unbundle: true,
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2024',
  publint: true,
  external: ['@nestjs/common', '@nestjs/core', 'reflect-metadata', 'rxjs'],
})
