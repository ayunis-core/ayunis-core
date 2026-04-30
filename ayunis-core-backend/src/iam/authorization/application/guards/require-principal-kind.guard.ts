import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { PrincipalKind } from 'src/iam/authentication/domain/active-principal.entity';
import { getPrincipal } from 'src/iam/authentication/application/util/get-principal';
import { REQUIRE_PRINCIPAL_KIND_KEY } from '../decorators/require-principal-kind.decorator';

@Injectable()
export class RequirePrincipalKindGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredKind = this.reflector.getAllAndOverride<PrincipalKind>(
      REQUIRE_PRINCIPAL_KIND_KEY,
      [context.getHandler(), context.getClass()],
    );
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Reflector returns T but is undefined at runtime when no metadata is set
    if (!requiredKind) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const principal = getPrincipal(request);
    if (!principal) {
      return false;
    }
    return principal.kind === requiredKind;
  }
}
