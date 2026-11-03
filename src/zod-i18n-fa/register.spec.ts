import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { registerPersianZod } from './register.js'

describe('registerPersianZod', () => {
  let originalConfig: unknown

  beforeEach(() => {
    // Snapshot the previous config so we can restore it after the test file runs
    originalConfig = (z as unknown as { config?: unknown }).config
  })

  afterEach(() => {
    // Reset error map to nothing — this makes the test file idempotent
    z.config({ customError: undefined })
  })

  it('applies Persian messages to schema parsing', () => {
    registerPersianZod()

    const schema = z.object({ name: z.string().min(3) })
    const result = schema.safeParse({ name: 'ab' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('حداقل 3 کاراکتر')
  })

  it('replaces any previously registered error map', () => {
    z.config({ customError: () => 'ENGLISH MESSAGE' })

    registerPersianZod()

    const schema = z.string().min(5)
    const result = schema.safeParse('ab')

    expect(result.error?.issues[0]?.message).not.toBe('ENGLISH MESSAGE')
    expect(result.error?.issues[0]?.message).toContain('حداقل')
  })
})
