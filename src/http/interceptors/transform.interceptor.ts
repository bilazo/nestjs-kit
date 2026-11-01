import { Injectable, StreamableFile } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { map } from 'rxjs'

import { ENVELOPE_ENABLED } from '../constants.js'

import type { ApiResponse } from '../types/api-response.type.js'
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { Observable } from 'rxjs'

/**
 * Wraps successful responses in `{ data: T }` — but only on routes explicitly
 * marked with `@ApiEnvelope()`. Routes without the decorator are returned
 * unchanged, so adoption is incremental and no existing endpoint is affected.
 *
 * Reads the metadata at method level first, then controller level (so a
 * whole controller can opt in with a class-level `@ApiEnvelope()`).
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    const enabled = this.reflector.getAllAndOverride<boolean>(ENVELOPE_ENABLED, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!enabled) {
      return next.handle()
    }

    // StreamableFile carries its own body (file download) — wrapping would break it.
    return next.handle().pipe(map((data) => (data instanceof StreamableFile ? data : { data })))
  }
}
