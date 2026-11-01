import 'reflect-metadata'
import { describe, expect, it } from 'vitest'

import { ENVELOPE_ENABLED } from '../constants.js'
import { ApiEnvelope } from './api-envelope.decorator.js'

// Internal Swagger metadata key. Used directly to avoid depending on
// `@nestjs/swagger/dist/constants`, which is not part of the public API.
const SWAGGER_API_RESPONSE = 'swagger/apiResponse'

class UserDto {
  id!: string
  email!: string
}

function getResponses(target: object, method: string): Record<string, unknown> | undefined {
  const fn = (target as Record<string, unknown>)[method]
  if (typeof fn !== 'function') return undefined
  return Reflect.getMetadata(SWAGGER_API_RESPONSE, fn) as Record<string, unknown> | undefined
}

function getEnvelopeMeta(target: object, method: string): unknown {
  const fn = (target as Record<string, unknown>)[method]
  if (typeof fn !== 'function') return undefined
  return Reflect.getMetadata(ENVELOPE_ENABLED, fn)
}

describe('ApiEnvelope', () => {
  it('sets the envelope metadata on the handler', () => {
    class Controller {
      @ApiEnvelope(UserDto)
      getOne(): UserDto {
        return { id: '1', email: 'x' }
      }
    }

    expect(getEnvelopeMeta(Controller.prototype, 'getOne')).toBe(true)
  })

  it('documents the single-resource envelope in Swagger', () => {
    class Controller {
      @ApiEnvelope(UserDto)
      getOne(): UserDto {
        return { id: '1', email: 'x' }
      }
    }

    const responses = getResponses(Controller.prototype, 'getOne')

    expect(responses?.['200']).toMatchObject({
      schema: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: expect.stringContaining('UserDto') },
        },
      },
    })
  })

  it('documents an array envelope when isArray is true', () => {
    class Controller {
      @ApiEnvelope(UserDto, { isArray: true })
      list(): UserDto[] {
        return []
      }
    }

    const responses = getResponses(Controller.prototype, 'list')

    expect(responses?.['200']).toMatchObject({
      schema: {
        properties: {
          data: {
            type: 'array',
            items: { $ref: expect.stringContaining('UserDto') },
          },
        },
      },
    })
  })

  it('respects a custom status code', () => {
    class Controller {
      @ApiEnvelope(UserDto, { status: 201 })
      create(): UserDto {
        return { id: '1', email: 'x' }
      }
    }

    const responses = getResponses(Controller.prototype, 'create')

    expect(responses?.['201']).toBeDefined()
  })

  it('sets the metadata but no Swagger response when called without a model', () => {
    class Controller {
      @ApiEnvelope()
      raw(): unknown {
        return {}
      }
    }

    expect(getEnvelopeMeta(Controller.prototype, 'raw')).toBe(true)
    expect(getResponses(Controller.prototype, 'raw')).toBeUndefined()
  })
})
