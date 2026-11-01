import type { JwtPayload } from './jwt-payload.js'
import type { IncomingMessage } from 'node:http'

/**
 * Framework-agnostic request carrying an authenticated user.
 * Populated by the JWT strategy (or a guard) on the raw request object.
 */
export interface AuthenticatedRequest extends IncomingMessage {
  user?: JwtPayload
}
