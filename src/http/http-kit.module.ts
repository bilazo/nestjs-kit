import { Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'

import { AllExceptionsFilter } from './filters/all-exceptions.filter.js'
import { TransformInterceptor } from './interceptors/transform.interceptor.js'

import type { DynamicModule } from '@nestjs/common'

/**
 * Registers `AllExceptionsFilter` and `TransformInterceptor` globally.
 * One import in `AppModule` gives the whole project the `{ data }` / `{ error }`
 * response contract.
 *
 * `JwtAuthGuard` is intentionally NOT registered here — auth is opt-in per
 * controller via `@UseGuards(JwtAuthGuard)`, so public routes don't break.
 *
 * @example
 * @Module({
 *   imports: [HttpKitModule.forRoot()],
 * })
 * export class AppModule {}
 */
@Module({})
export class HttpKitModule {
  static forRoot(): DynamicModule {
    return {
      module: HttpKitModule,
      global: true,
      providers: [
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        // Registered globally but only ACTS on routes with @ApiEnvelope().
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    }
  }
}
