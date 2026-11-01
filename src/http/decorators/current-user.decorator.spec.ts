import { UnauthorizedException } from '@nestjs/common'
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'

import { CurrentUser } from './current-user.decorator.js'

import type { JwtPayload } from '../types/jwt-payload.js'
import type { AuthenticatedRequest } from '../types/request.type.js'
import type { ExecutionContext } from '@nestjs/common'

type Factory = (data: unknown, ctx: ExecutionContext) => unknown

function getFactory(): Factory {
  class TestClass {
    public method(@CurrentUser() _arg: unknown) {}
  }
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'method') as Record<
    string,
    { factory: Factory }
  >
  const entry = Object.values(metadata)[0]
  if (!entry) throw new Error('test setup: no param metadata found')
  return entry.factory
}

function makePayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: 'user-1',
    iat: 1_000_000_000,
    exp: 2_000_000_000,
    ...overrides,
  }
}

function makeContext(user: JwtPayload | undefined): ExecutionContext {
  const request: Partial<AuthenticatedRequest> = user === undefined ? {} : { user }
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext
}

describe('CurrentUser', () => {
  const factory = getFactory()

  it('returns the full user when no key is given', () => {
    const user = makePayload()

    const result = factory(undefined, makeContext(user))

    expect(result).toBe(user)
  })

  it('returns a specific claim when a key is given', () => {
    const result = factory('sub', makeContext(makePayload({ sub: 'user-1' })))

    expect(result).toBe('user-1')
  })

  it('accepts custom claims not declared on the base JwtPayload', () => {
    const user: JwtPayload & { tenantId: string } = {
      ...makePayload(),
      tenantId: 'tenant-9',
    }

    const result = factory('tenantId', makeContext(user))

    expect(result).toBe('tenant-9')
  })

  it('returns undefined for an existing user with a missing key', () => {
    const result = factory('missing', makeContext(makePayload()))

    expect(result).toBeUndefined()
  })

  it('throws UnauthorizedException with the Persian message when user is absent', () => {
    expect(() => factory(undefined, makeContext(undefined))).toThrow(UnauthorizedException)
    expect(() => factory(undefined, makeContext(undefined))).toThrow('کاربر احراز هویت نشده است')
  })

  it('throws before looking at the key when user is absent', () => {
    expect(() => factory('sub', makeContext(undefined))).toThrow(UnauthorizedException)
  })
})
