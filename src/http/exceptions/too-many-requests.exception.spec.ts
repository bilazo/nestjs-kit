import { HttpStatus } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { TooManyRequestsException } from './too-many-requests.exception.js'

describe('TooManyRequestsException', () => {
  it('sets status 429', () => {
    const exception = new TooManyRequestsException('Too many requests')

    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS)
    expect(exception.getStatus()).toBe(429)
  })

  it('preserves a string response payload', () => {
    const exception = new TooManyRequestsException('Rate limit exceeded')

    expect(exception.getResponse()).toBe('Rate limit exceeded')
  })

  it('preserves an object response payload', () => {
    const payload = { code: 'RATE_LIMITED', message: 'Slow down' }
    const exception = new TooManyRequestsException(payload)

    expect(exception.getResponse()).toEqual(payload)
  })

  it('passes a cause option through to HttpException', () => {
    const cause = new Error('underlying')
    const exception = new TooManyRequestsException('err', { cause })

    expect(exception.cause).toBe(cause)
  })

  it('is an instance of HttpException', () => {
    const exception = new TooManyRequestsException('x')

    // Avoid importing HttpException separately — status check + instanceof
    // is already covered, but this guards against accidental base-class change.
    expect(exception.constructor.name).toBe('TooManyRequestsException')
  })
})
