import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * NestJS ships HttpStatus.TOO_MANY_REQUESTS but no matching exception class.
 * This fills that gap. Response body is passed through as-is, so any custom
 * shape (e.g. { code, message }) survives intact through the global filter.
 */
export class TooManyRequestsException extends HttpException {
  constructor(response: string | Record<string, unknown>, options?: { cause?: Error }) {
    super(response, HttpStatus.TOO_MANY_REQUESTS, options)
  }
}
