import { applyDecorators, SetMetadata } from '@nestjs/common'
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger'
import { z } from 'zod'

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

type ZodModel = z.ZodType

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
  model: Type<T> | ZodModel,
  options?: ApiEnvelopeOptions,
): MethodDecorator & ClassDecorator
export function ApiEnvelope(): MethodDecorator & ClassDecorator
export function ApiEnvelope<T>(
  model?: Type<T> | ZodModel,
  options: ApiEnvelopeOptions = {},
): MethodDecorator & ClassDecorator {
  if (!model) {
    return SetMetadata(ENVELOPE_ENABLED, true)
  }

  const { isArray = false, status = 200, description } = options
  const isZod = isZodSchema(model)
  const dataSchema = wrapArray(
    isZod ? z.toJSONSchema(model) : { $ref: getSchemaPath(model) },
    isArray,
  )

  return applyDecorators(
    SetMetadata(ENVELOPE_ENABLED, true),
    // ApiExtraModels فقط برای کلاس‌ها معنی داره:
    ...(isZod ? [] : [ApiExtraModels(model as Type<T>)]),
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

/** یک schema را در صورت نیاز داخل آرایه می‌پیچد. */
function wrapArray(items: Record<string, unknown>, isArray: boolean): Record<string, unknown> {
  return isArray ? { type: 'array', items } : items
}

function isZodSchema(value: unknown): value is ZodModel {
  return value instanceof z.ZodType
}
