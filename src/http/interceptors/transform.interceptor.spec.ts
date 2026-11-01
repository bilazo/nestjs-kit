import { StreamableFile } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { of } from 'rxjs'
import { describe, expect, it } from 'vitest'

import { ENVELOPE_ENABLED } from '../constants.js'
import { TransformInterceptor } from './transform.interceptor.js'

import type { CallHandler, ExecutionContext } from '@nestjs/common'

interface FakeContextOptions {
  handlerMeta?: boolean
  classMeta?: boolean
}

function makeContext({ handlerMeta, classMeta }: FakeContextOptions = {}): ExecutionContext {
  // Fresh objects per call → no metadata leak between tests.
  const handlerRef: object = { __kind: 'handler' }
  const classRef: object = { __kind: 'class' }

  if (handlerMeta !== undefined) {
    Reflect.defineMetadata(ENVELOPE_ENABLED, handlerMeta, handlerRef)
  }
  if (classMeta !== undefined) {
    Reflect.defineMetadata(ENVELOPE_ENABLED, classMeta, classRef)
  }

  return {
    getHandler: () => handlerRef,
    getClass: () => classRef,
  } as unknown as ExecutionContext
}

function handlerOf<T>(value: T): CallHandler<T> {
  return { handle: () => of(value) }
}

async function run<T>(value: T, ctx: ExecutionContext): Promise<unknown> {
  const interceptor = new TransformInterceptor<T>(new Reflector())
  const obs = interceptor.intercept(ctx, handlerOf(value))
  return new Promise((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject })
  })
}

describe('TransformInterceptor', () => {
  describe('without the decorator', () => {
    it('passes an object through unchanged', async () => {
      const value = { id: 1 }

      const result = await run(value, makeContext())

      expect(result).toBe(value)
    })

    it('passes an array through unchanged', async () => {
      const value = [1, 2, 3]

      const result = await run(value, makeContext())

      expect(result).toBe(value)
    })
  })

  describe('with the decorator on the handler', () => {
    it('wraps an object in { data }', async () => {
      const value = { id: 1 }

      const result = await run(value, makeContext({ handlerMeta: true }))

      expect(result).toEqual({ data: value })
    })

    it('wraps an array in { data }', async () => {
      const value = [1, 2]

      const result = await run(value, makeContext({ handlerMeta: true }))

      expect(result).toEqual({ data: value })
    })

    it('wraps null in { data: null }', async () => {
      const result = await run(null, makeContext({ handlerMeta: true }))

      expect(result).toEqual({ data: null })
    })

    it('does not wrap StreamableFile (file downloads)', async () => {
      const file = new StreamableFile(Buffer.from('content'))

      const result = await run(file, makeContext({ handlerMeta: true }))

      expect(result).toBe(file)
    })
  })

  describe('with the decorator on the controller', () => {
    it('wraps because the class is opted in', async () => {
      const value = { id: 1 }

      const result = await run(value, makeContext({ classMeta: true }))

      expect(result).toEqual({ data: value })
    })
  })

  describe('priority', () => {
    it('handler true overrides class undefined', async () => {
      const result = await run({ id: 1 }, makeContext({ handlerMeta: true }))

      expect(result).toEqual({ data: { id: 1 } })
    })

    it('handler false overrides class true', async () => {
      const result = await run({ id: 1 }, makeContext({ handlerMeta: false, classMeta: true }))

      expect(result).toEqual({ id: 1 })
    })
  })
})
