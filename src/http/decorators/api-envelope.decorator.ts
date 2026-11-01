import { applyDecorators, SetMetadata } from '@nestjs/common'
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger'

import { ENVELOPE_ENABLED } from '../constants.js'

import type { Type } from '@nestjs/common'

export interface ApiEnvelopeOptions {
  /** Schema is an array of `model` (e.g. list endpoints). */
  isArray?: boolean
  /** HTTP status to document. Defaults to 200. */
  status?: number
  /** Description shown in Swagger UI. */
  description?: string
}

/**
 * Enables `{ data }` envelope on this route AND documents it in Swagger.
 *
 * @example
 * // Enveloped + documented
 * @ApiEnvelope(UserDto)
 * @Get(':id')
 * getOne(): Promise<UserDto> { ... }
 *
 * @example
 * // Enveloped + documented as array
 * @ApiEnvelope(UserDto, { isArray: true })
 * @Get()
 * list(): Promise<UserDto[]> { ... }
 *
 * @example
 * // Enveloped, no model docs (e.g. mixed shapes)
 * @ApiEnvelope()
 * @Get('raw')
 * raw(): Promise<unknown> { ... }
 */
export function ApiEnvelope<T>(
  model: Type<T>,
  options?: ApiEnvelopeOptions,
): MethodDecorator & ClassDecorator
export function ApiEnvelope(): MethodDecorator & ClassDecorator
export function ApiEnvelope<T>(
  model?: Type<T>,
  options: ApiEnvelopeOptions = {},
): MethodDecorator & ClassDecorator {
  if (!model) {
    return SetMetadata(ENVELOPE_ENABLED, true)
  }

  const { isArray = false, status = 200, description } = options

  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) }

  return applyDecorators(
    SetMetadata(ENVELOPE_ENABLED, true),
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['data'],
        properties: { data: dataSchema },
      },
    }),
  )
}
