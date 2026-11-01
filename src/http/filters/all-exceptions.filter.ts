import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import type { IncomingMessage } from 'node:http'

interface NormalizedError {
  code: string
  message: string
  details?: unknown
}

// Express augments IncomingMessage with `originalUrl`. Typing it optional keeps
// this filter independent of any adapter while preserving the global-prefix-safe path.
type RequestLike = IncomingMessage & { originalUrl?: string }

// Duck-typed response — Express: res.status(n).json(body), Fastify: reply.code(n).send(body).
// Importing neither keeps the filter framework-agnostic.
interface ResponseLike {
  status?: (code: number) => { json: (body: unknown) => unknown }
  json?: (body: unknown) => unknown
  code?: (code: number) => { send: (body: unknown) => unknown }
  send?: (body: unknown) => unknown
}

// Map instead of a switch — one place to extend, avoids no-unsafe-enum-comparison.
const STATUS_ERROR_CODES = new Map<number, string>([
  [HttpStatus.BAD_REQUEST, 'BAD_REQUEST'],
  [HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'],
  [HttpStatus.FORBIDDEN, 'FORBIDDEN'],
  [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
  [HttpStatus.CONFLICT, 'CONFLICT'],
  [HttpStatus.UNPROCESSABLE_ENTITY, 'UNPROCESSABLE_ENTITY'],
  [HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS'],
])

// Plain number so comparison against `status: number` is type-safe.
const SERVER_ERROR_MIN = 500

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<unknown>()
    const request = ctx.getRequest<RequestLike>()

    const status = this.resolveStatus(exception)
    const error = this.normalize(exception, status)

    // originalUrl (not url) — Nest strips the global prefix from request.url
    const path = request.originalUrl ?? request.url

    const payload = {
      error,
      meta: {
        path,
        method: request.method,
        timestamp: new Date().toISOString(),
      },
    }

    if (status >= SERVER_ERROR_MIN) {
      const stack = exception instanceof Error ? exception.stack : String(exception)
      this.logger.error(`${request.method} ${path} → ${status}`, stack)
    } else {
      this.logger.warn(`${request.method} ${path} → ${status} ${error.code}`)
    }

    this.writeResponse(response, status, payload)
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus()
    return HttpStatus.INTERNAL_SERVER_ERROR
  }

  private normalize(exception: unknown, status: number): NormalizedError {
    if (exception instanceof HttpException) {
      const res = exception.getResponse()

      if (typeof res === 'string') {
        return { code: this.codeFromStatus(status), message: res }
      }

      // Safe type guard in place of `res as Record<string, unknown>`
      if (this.isRecord(res)) {
        const code = typeof res.code === 'string' ? res.code : this.codeFromStatus(status)

        // class-validator surfaces an array of messages
        if (Array.isArray(res.message)) {
          const first = res.message[0]
          return {
            code,
            message: typeof first === 'string' ? first : 'داده‌های ورودی نامعتبر است',
            details: res.message,
          }
        }

        const message = typeof res.message === 'string' ? res.message : exception.message
        return { code, message }
      }
    }

    if (exception instanceof Error) {
      const isProd = process.env.NODE_ENV === 'production'
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: isProd ? 'خطای داخلی سرور. لطفاً بعداً تلاش کنید' : exception.message,
      }
    }

    return { code: 'INTERNAL_SERVER_ERROR', message: 'خطای داخلی سرور. لطفاً بعداً تلاش کنید' }
  }

  private codeFromStatus(status: number): string {
    return STATUS_ERROR_CODES.get(status) ?? 'HTTP_ERROR'
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  private writeResponse(response: unknown, status: number, body: unknown): void {
    if (typeof response !== 'object' || response === null) {
      throw new Error('AllExceptionsFilter: unsupported response object')
    }

    const res = response as ResponseLike

    // Express / Nest's default adapter
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      res.status(status).json(body)
      return
    }

    // Fastify
    if (typeof res.code === 'function' && typeof res.send === 'function') {
      res.code(status).send(body)
      return
    }

    throw new Error('AllExceptionsFilter: unsupported response object')
  }
}
