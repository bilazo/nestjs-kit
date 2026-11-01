/**
 * Envelope applied by `TransformInterceptor` to every successful response.
 * Errors use a different shape (see `AllExceptionsFilter`) — `{ error, meta }`.
 */
export interface ApiResponse<T> {
  data: T
}
