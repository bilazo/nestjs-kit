import { createParamDecorator, UnauthorizedException } from '@nestjs/common'

import type { AuthenticatedRequest } from '../types/request.type.js'

export const CurrentUser = createParamDecorator<string | undefined, unknown>((data, ctx) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()

  if (!request.user) {
    throw new UnauthorizedException('کاربر احراز هویت نشده است')
  }

  if (data !== undefined) {
    return (request.user as unknown as Record<string, unknown>)[data]
  }

  return request.user
})
