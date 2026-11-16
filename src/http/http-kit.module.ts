import { Global, Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'

import { AllExceptionsFilter } from './filters/all-exceptions.filter.js'
import { TransformInterceptor } from './interceptors/transform.interceptor.js'
import { installZodDefsSwaggerFix } from './swagger/zod-defs-fix.js'

// نصب یک‌باره و سراسری. چون این فایل در AppModule ایمپورت می‌شه،
// قبل از bootstrap و قبل از فراخوانی createDocument فعال می‌شه.
installZodDefsSwaggerFix()

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
 *   imports: [HttpKitModule],
 * })
 * export class AppModule {}
 */
@Global()
@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Registered globally but only ACTS on routes with @ApiEnvelope().
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class HttpKitModule {}
