import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UUID } from 'crypto';

import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { getClientIp } from 'src/common/util/ip.util';
import { isIpInCidrs } from '../../domain/cidr.util';
import { IpAllowlistRepository } from '../ports/ip-allowlist.repository';
import { IpNotAllowedError } from '../ip-allowlist.errors';
import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';

interface CacheEntry {
  cidrs: string[] | null;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;

@Injectable()
export class IpAllowlistGuard implements CanActivate {
  private readonly logger = new Logger(IpAllowlistGuard.name);
  private readonly cache = new Map<UUID, CacheEntry>();

  constructor(
    private readonly reflector: Reflector,
    private readonly repository: IpAllowlistRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUser | undefined;

    if (!user) {
      return true;
    }

    const orgId = user.orgId;
    const cidrs = await this.getCidrs(orgId);

    if (!cidrs || cidrs.length === 0) {
      return true;
    }

    const clientIp = getClientIp(request);

    if (!clientIp) {
      this.logger.warn(
        `Could not determine client IP for user ${user.id} in org ${orgId}`,
      );
      throw new IpNotAllowedError();
    }

    if (isIpInCidrs(clientIp, cidrs)) {
      return true;
    }

    throw new IpNotAllowedError();
  }

  invalidateCache(orgId: UUID): void {
    this.cache.delete(orgId);
  }

  private async getCidrs(orgId: UUID): Promise<string[] | null> {
    const now = Date.now();
    const cached = this.cache.get(orgId);

    if (cached && cached.expiresAt > now) {
      return cached.cidrs;
    }

    const entity = await this.repository.findByOrgId(orgId);
    const cidrs = entity?.cidrs ?? null;

    this.cache.set(orgId, { cidrs, expiresAt: now + CACHE_TTL_MS });

    return cidrs;
  }
}
