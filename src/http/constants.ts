/**
 * Metadata key set by `@ApiEnvelope()` and read by `TransformInterceptor`.
 * `Symbol.for` (not `Symbol`) so a dual-loaded copy of this package still
 * agrees on the same key.
 */
export const ENVELOPE_ENABLED = Symbol.for('@bilazo/nestjs-kit:envelope-enabled')
