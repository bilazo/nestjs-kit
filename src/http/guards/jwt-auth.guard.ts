import { Injectable, UnauthorizedException } from '@nestjs/common'

import type { JwtPayload } from '../types/jwt-payload.js'
import type { AuthenticatedRequest } from '../types/request.type.js'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { JwtService } from '@nestjs/jwt'

const BEARER_PREFIX = 'Bearer '

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    const header = request.headers.authorization

    if (!header || !header.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException({
        code: 'MISSING_TOKEN',
        message: 'برای دسترسی، ابتدا وارد شوید',
      })
    }

    const token = header.slice(BEARER_PREFIX.length).trim()

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token)
      request.user = payload
      return true
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید',
      })
    }
  }
}
