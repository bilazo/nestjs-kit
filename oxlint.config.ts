import { base, unicorn, depend, node, promise, vitest } from '@bilazo/oxc-config/lint'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [base(), unicorn(), depend(), node(), promise(), vitest()],
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        'import/no-relative-parent-imports': 'off',
      },
    },
    {
      files: ['**/*.{ts,mts,cts,tsx}'],
      rules: {
        // NestJS empty decorated classes are valid (modules, controllers)
        'typescript/no-extraneous-class': ['error', { allowWithDecorator: true }],
        // NestJS DI requires runtime class references — disable without type-aware linting
        'typescript/consistent-type-imports': 'off',
      },
    },
    {
      files: ['**/*.spec.ts'],
      rules: {
        'max-classes-per-file': 'off',
        'vitest/prefer-lowercase-title': 'off',
      },
    },
    {
      files: ['**/*.module.ts'],
      rules: {
        'typescript/no-extraneous-class': 'off',
      },
    },
  ],
})
