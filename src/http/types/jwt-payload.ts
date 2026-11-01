/**
 * Decoded JWT payload AND the shape of `request.user`.
 *
 * Extend in a project via interface augmentation when you need custom claims:
 *
 *   declare module '@bilazo/nestjs-kit/http' {
 *     interface JwtPayload {
 *       id: string
 *       mobile: string
 *       firstName: string
 *       lastName: string
 *     }
 *   }
 *
 * Augmented fields are visible to `AuthenticatedRequest['user']`
 * and to `@CurrentUser('customField')` at the call site.
 */
export interface JwtPayload {
  /** Subject — the authenticated user's id */
  sub: string
  /** Issued-at (unix seconds) */
  iat: number
  /** Expiry (unix seconds) */
  exp: number
}
