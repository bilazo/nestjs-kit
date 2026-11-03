import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { persianZodErrorMap } from './error-map.js'

type RawIssue = z.core.$ZodRawIssue

function makeIssue(overrides: Partial<RawIssue> & { code: string }): RawIssue {
  return {
    input: undefined,
    path: [],
    ...overrides,
  } as RawIssue
}

describe('persianZodErrorMap', () => {
  describe('invalid_type', () => {
    it('says الزامی است when input is undefined', () => {
      const issue = makeIssue({ code: 'invalid_type', input: undefined, path: ['name'] })
      expect(persianZodErrorMap(issue)).toBe('name الزامی است')
    })

    it('says باید از نوع صحیح باشد for wrong types', () => {
      const issue = makeIssue({ code: 'invalid_type', input: 'abc', path: ['age'] })
      expect(persianZodErrorMap(issue)).toBe('age باید از نوع صحیح باشد')
    })
  })

  describe('too_small', () => {
    it('uses حداقل with default character unit for strings', () => {
      const issue = makeIssue({
        code: 'too_small',
        path: ['name'],
        minimum: 3,
        origin: 'string',
        inclusive: true,
      } as RawIssue)
      expect(persianZodErrorMap(issue)).toBe('name باید حداقل 3 کاراکتر باشد')
    })

    it('uses حداقل with مورد unit for arrays', () => {
      const issue = makeIssue({
        code: 'too_small',
        path: ['items'],
        minimum: 1,
        origin: 'array',
        inclusive: true,
      } as RawIssue)
      expect(persianZodErrorMap(issue)).toBe('items باید حداقل 1 مورد باشد')
    })

    it('drops the unit when origin is numeric', () => {
      const issue = makeIssue({
        code: 'too_small',
        path: ['age'],
        minimum: 18,
        origin: 'number',
        inclusive: true,
      } as RawIssue)
      expect(persianZodErrorMap(issue)).toBe('age باید حداقل 18 باشد')
    })

    it('says باید ... باشد when exact is true', () => {
      const issue = makeIssue({
        code: 'too_small',
        path: ['code'],
        minimum: 6,
        origin: 'string',
        exact: true,
        inclusive: true,
      } as RawIssue)
      expect(persianZodErrorMap(issue)).toBe('code باید 6 کاراکتر باشد')
    })
  })

  describe('too_big', () => {
    it('uses حداکثر', () => {
      const issue = makeIssue({
        code: 'too_big',
        path: ['name'],
        maximum: 50,
        origin: 'string',
        inclusive: true,
      } as RawIssue)
      expect(persianZodErrorMap(issue)).toBe('name باید حداکثر 50 کاراکتر باشد')
    })
  })

  describe('other codes', () => {
    it('handles invalid_format', () => {
      const issue = makeIssue({ code: 'invalid_format', path: ['email'] })
      expect(persianZodErrorMap(issue)).toBe('email معتبر نیست')
    })

    it('joins unrecognized keys with Persian comma', () => {
      const issue = makeIssue({
        code: 'unrecognized_keys',
        keys: ['a', 'b'],
      } as RawIssue)
      expect(persianZodErrorMap(issue)).toBe('فیلد(های) ناشناخته: a، b')
    })

    it('handles not_multiple_of', () => {
      const issue = makeIssue({
        code: 'not_multiple_of',
        path: ['qty'],
        divisor: 5,
      } as RawIssue)
      expect(persianZodErrorMap(issue)).toBe('qty باید مضربی از 5 باشد')
    })

    it('handles invalid_value', () => {
      const issue = makeIssue({ code: 'invalid_value', path: ['role'] })
      expect(persianZodErrorMap(issue)).toBe('role باید یکی از مقادیر مجاز باشد')
    })

    it('handles invalid_union', () => {
      const issue = makeIssue({ code: 'invalid_union', path: ['payload'] })
      expect(persianZodErrorMap(issue)).toBe('payload با هیچ‌کدام از حالت‌های مجاز تطابق ندارد')
    })

    it('returns undefined for unknown codes (falls back to zod default)', () => {
      const issue = {
        code: 'unknown_future_code',
        path: ['x'],
        input: undefined,
      } as unknown as z.core.$ZodRawIssue

      expect(persianZodErrorMap(issue)).toBeUndefined()
    })
  })

  describe('fallback title', () => {
    it('uses فیلد when path is empty', () => {
      const issue = makeIssue({ code: 'invalid_format', path: [] })
      expect(persianZodErrorMap(issue)).toBe('فیلد معتبر نیست')
    })
  })
})
