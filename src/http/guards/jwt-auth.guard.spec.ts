import { UnauthorizedException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { JwtAuthGuard } from './jwt-auth.guard.js'

import type { JwtPayload } from '../types/jwt-payload.js'
import type { AuthenticatedRequest } from '../types/request.type.js'
import type { ExecutionContext } from '@nestjs/common'
import type { JwtService } from '@nestjs/jwt'

function makeContext(headers: Record<string, string> = {}): {
  ctx: ExecutionContext
  request: Partial<AuthenticatedRequest>
} {
  const request: Partial<AuthenticatedRequest> = { headers }
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext
  return { ctx, request }
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  return promise.catch((error: unknown) => error)
}

describe('JwtAuthGuard', () => {
  let verifyAsync: ReturnType<typeof vi.fn>
  let jwt: JwtService
  let guard: JwtAuthGuard

  beforeEach(() => {
    verifyAsync = vi.fn()
    jwt = { verifyAsync } as unknown as JwtService
    guard = new JwtAuthGuard(jwt)
  })

  it('throws MISSING_TOKEN when the Authorization header is absent', async () => {
    const { ctx } = makeContext()

    const error = await captureError(guard.canActivate(ctx))

    expect(error).toBeInstanceOf(UnauthorizedException)
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      code: 'MISSING_TOKEN',
    })
  })

  it('throws MISSING_TOKEN when the header is not Bearer', async () => {
    const { ctx } = makeContext({ authorization: 'Basic abc' })

    const error = await captureError(guard.canActivate(ctx))

    expect(error).toBeInstanceOf(UnauthorizedException)
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      code: 'MISSING_TOKEN',
    })
  })

  it('sets request.user to the verified payload and returns true', async () => {
    const payload: JwtPayload = { sub: 'user-1', iat: 1, exp: 2 }
    verifyAsync.mockResolvedValue(payload)

    const { ctx, request } = makeContext({ authorization: 'Bearer good.jwt.token' })

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
    expect(request.user).toBe(payload)
    expect(verifyAsync).toHaveBeenCalledWith('good.jwt.token')
  })

  it('trims whitespace around the token', async () => {
    verifyAsync.mockResolvedValue({ sub: 'user-1', iat: 1, exp: 2 })
    const { ctx } = makeContext({ authorization: 'Bearer   good.jwt.token  ' })

    await guard.canActivate(ctx)

    expect(verifyAsync).toHaveBeenCalledWith('good.jwt.token')
  })

  it('throws INVALID_TOKEN when verification fails', async () => {
    verifyAsync.mockRejectedValue(new Error('signature invalid'))
    const { ctx } = makeContext({ authorization: 'Bearer bad' })

    const error = await captureError(guard.canActivate(ctx))

    expect(error).toBeInstanceOf(UnauthorizedException)
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      code: 'INVALID_TOKEN',
    })
  })

  it('does not leak the underlying verification error message', async () => {
    verifyAsync.mockRejectedValue(new Error('jsonwebtoken: invalid signature'))
    const { ctx } = makeContext({ authorization: 'Bearer bad' })

    const error = await captureError(guard.canActivate(ctx))

    expect(error).toBeInstanceOf(UnauthorizedException)
    const response = (error as UnauthorizedException).getResponse() as { message: string }
    expect(response.message).not.toContain('jsonwebtoken')
  })
})
