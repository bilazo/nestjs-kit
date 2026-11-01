import { HttpException, HttpStatus, Logger } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AllExceptionsFilter } from './all-exceptions.filter.js'

import type { ArgumentsHost } from '@nestjs/common'
import type { IncomingMessage } from 'node:http'

type RequestLike = IncomingMessage & { originalUrl?: string }

interface ExpressRes {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  body?: unknown
}

interface FastifyReply {
  code: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
  body?: unknown
}

function expressHost(request: Partial<RequestLike> = {}): {
  host: ArgumentsHost
  res: ExpressRes
} {
  const res: ExpressRes = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockImplementation((body: unknown) => {
    res.body = body
    return res
  })

  const req = {
    method: 'GET',
    url: '/x',
    originalUrl: '/x',
    headers: {},
    ...request,
  } as RequestLike

  const host = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost

  return { host, res }
}

function fastifyHost(request: Partial<RequestLike> = {}): {
  host: ArgumentsHost
  reply: FastifyReply
} {
  const reply: FastifyReply = { code: vi.fn(), send: vi.fn() }
  reply.code.mockReturnValue(reply)
  reply.send.mockImplementation((body: unknown) => {
    reply.body = body
  })

  const req = {
    method: 'GET',
    url: '/x',
    originalUrl: '/x',
    headers: {},
    ...request,
  } as RequestLike

  const host = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => reply,
    }),
  } as unknown as ArgumentsHost

  return { host, reply }
}

let errorSpy: ReturnType<typeof vi.spyOn>
let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
  warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AllExceptionsFilter', () => {
  describe('HttpException normalization', () => {
    it('maps a string payload to a status-derived code', () => {
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost()

      filter.catch(new HttpException('nope', HttpStatus.BAD_REQUEST), host)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.body).toMatchObject({
        error: { code: 'BAD_REQUEST', message: 'nope' },
      })
    })

    it('preserves a custom `code` on object payloads', () => {
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost()

      filter.catch(
        new HttpException({ code: 'PASSWORD_WEAK', message: 'too weak' }, HttpStatus.BAD_REQUEST),
        host,
      )

      expect(res.body).toMatchObject({
        error: { code: 'PASSWORD_WEAK', message: 'too weak' },
      })
    })

    it('uses the first validation message and keeps the array in details', () => {
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost()

      filter.catch(
        new HttpException(
          { message: ['email invalid', 'password too short'], error: 'Bad Request' },
          HttpStatus.BAD_REQUEST,
        ),
        host,
      )

      expect(res.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: 'email invalid',
          details: ['email invalid', 'password too short'],
        },
      })
    })

    it('falls back to the Persian message when the first validation entry is not a string', () => {
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost()

      filter.catch(
        new HttpException({ message: [{ nested: 'object' }] }, HttpStatus.BAD_REQUEST),
        host,
      )

      expect(res.body).toMatchObject({
        error: { message: 'داده‌های ورودی نامعتبر است' },
      })
    })

    it('falls back to `HTTP_ERROR` for unmapped statuses', () => {
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost()

      filter.catch(new HttpException('teapot', HttpStatus.I_AM_A_TEAPOT), host)

      expect(res.status).toHaveBeenCalledWith(418)
      expect(res.body).toMatchObject({ error: { code: 'HTTP_ERROR' } })
    })
  })

  describe('non-HttpException errors', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('exposes the real message outside production', () => {
      process.env.NODE_ENV = 'development'
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost()

      filter.catch(new Error('db connection refused'), host)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.body).toMatchObject({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'db connection refused' },
      })
    })

    it('hides the real message in production', () => {
      process.env.NODE_ENV = 'production'
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost()

      filter.catch(new Error('db connection refused'), host)

      expect(res.body).toMatchObject({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'خطای داخلی سرور. لطفاً بعداً تلاش کنید',
        },
      })
    })

    it('handles non-Error throws with the Persian fallback', () => {
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost()

      filter.catch('something odd', host)

      expect(res.body).toMatchObject({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'خطای داخلی سرور. لطفاً بعداً تلاش کنید',
        },
      })
    })
  })

  describe('meta', () => {
    it('prefers originalUrl over url', () => {
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost({ originalUrl: '/api/v1/users', url: '/v1/users' })

      filter.catch(new HttpException('x', HttpStatus.BAD_REQUEST), host)

      expect(res.body).toMatchObject({ meta: { path: '/api/v1/users' } })
    })

    it('falls back to url when originalUrl is missing', () => {
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost({ originalUrl: undefined, url: '/v1/users' })

      filter.catch(new HttpException('x', HttpStatus.BAD_REQUEST), host)

      expect(res.body).toMatchObject({ meta: { path: '/v1/users' } })
    })

    it('includes method and an ISO timestamp', () => {
      const filter = new AllExceptionsFilter()
      const { host, res } = expressHost({ method: 'POST' })

      filter.catch(new HttpException('x', HttpStatus.BAD_REQUEST), host)

      const body = res.body as { meta: { method: string; timestamp: string } }
      expect(body.meta.method).toBe('POST')
      expect(Number.isNaN(Date.parse(body.meta.timestamp))).toBe(false)
    })
  })

  describe('adapters', () => {
    it('works with a Fastify-style reply', () => {
      const filter = new AllExceptionsFilter()
      const { host, reply } = fastifyHost()

      filter.catch(new HttpException('x', HttpStatus.BAD_REQUEST), host)

      expect(reply.code).toHaveBeenCalledWith(400)
      expect(reply.send).toHaveBeenCalledOnce()
      expect(reply.body).toMatchObject({
        error: { code: 'BAD_REQUEST', message: 'x' },
      })
    })

    it('throws on unsupported response objects', () => {
      const filter = new AllExceptionsFilter()

      const host = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/x', headers: {} }),
          getResponse: () => ({ unexpected: true }),
        }),
      } as unknown as ArgumentsHost

      expect(() => filter.catch(new HttpException('x', HttpStatus.BAD_REQUEST), host)).toThrow(
        'unsupported response object',
      )
    })
  })

  describe('logging', () => {
    it('logs 5xx as error and 4xx as warn', () => {
      const filter = new AllExceptionsFilter()

      filter.catch(new Error('boom'), expressHost().host)
      filter.catch(new HttpException('nope', HttpStatus.BAD_REQUEST), expressHost().host)

      expect(errorSpy).toHaveBeenCalledOnce()
      expect(warnSpy).toHaveBeenCalledOnce()
    })

    it('includes the stack trace for 5xx errors', () => {
      const filter = new AllExceptionsFilter()
      const err = new Error('boom')

      filter.catch(err, expressHost().host)

      const [, trace] = errorSpy.mock.calls[0] as [string, string]
      expect(trace).toBe(err.stack)
    })
  })
})
