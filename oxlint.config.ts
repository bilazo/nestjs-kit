import { base, unicorn, node, vitest } from '@bilazo/oxc-config/lint'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [base(), unicorn(), node(), vitest()],
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        'import/no-relative-parent-imports': 'off',
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
