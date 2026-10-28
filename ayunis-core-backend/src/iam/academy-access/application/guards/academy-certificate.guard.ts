import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { UUID } from 'crypto';
import { buildAccessDeniedAuditContext } from 'src/common/util/access-denied-audit.util';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { ApiKeyPrincipal } from 'src/iam/authentication/application/strategies/api-key.strategy';
import { EvaluateAcademyAccessUseCase } from 'src/iam/academy-access/application/use-cases/evaluate-academy-access/evaluate-academy-access.use-case';
import { EvaluateAcademyAccessQuery } from 'src/iam/academy-access/application/use-cases/evaluate-academy-access/evaluate-academy-access.query';
import { AcademyCertificateRequiredError } from 'src/iam/academy-access/application/academy-access.errors';
import { REQUIRE_ACADEMY_CERTIFICATE_KEY } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';

interface RequestWithUser extends Request {
  user?: ActiveUser | ApiKeyPrincipal;
}

/**
 * Requests that never start or advance a conversation. Reads stay open so a
 * blocked user keeps access to their chat history, and DELETE stays open so
 * they can still clean up their own data.
 *
 * This is a verb-level rule: an endpoint that triggers inference from a GET
 * would slip through and must be gated explicitly.
 */
const UNGATED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'DELETE']);

@Injectable()
export class AcademyCertificateGuard implements CanActivate {
  private readonly logger = new Logger(AcademyCertificateGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly evaluateAcademyAccessUseCase: EvaluateAcademyAccessUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gated = this.reflector.getAllAndOverride<boolean | undefined>(
      REQUIRE_ACADEMY_CERTIFICATE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!gated) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (UNGATED_METHODS.has(request.method)) {
      return true;
    }

    const principal = this.resolvePrincipal(request);
    if (!principal) {
      this.logger.warn(
        buildAccessDeniedAuditContext(request),
        'No principal found on request when checking academy certificate',
      );
      return false;
    }

    // The certificate belongs to a person; an API key has no holder to certify.
    if (!principal.userId) {
      this.logger.warn(
        {
          orgId: principal.orgId,
        },
        'Academy certificate gate skipped for api-key principal',
      );
      return true;
    }

    const evaluation = await this.evaluateAcademyAccessUseCase.execute(
      new EvaluateAcademyAccessQuery(principal.userId, principal.orgId),
    );
    if (evaluation.allowed) {
      return true;
    }

    this.logger.warn(
      {
        ...buildAccessDeniedAuditContext(request, {
          id: principal.userId,
          orgId: principal.orgId,
        }),
        mode: evaluation.mode,
      },
      'Access denied: academy certificate required',
    );
    throw new AcademyCertificateRequiredError({
      mode: evaluation.mode,
      expiresAt: evaluation.expiresAt,
    });
  }

  private resolvePrincipal(
    request: RequestWithUser,
  ): { userId: UUID | null; orgId: UUID } | null {
    const user = request.user as unknown;
    if (!user || typeof user !== 'object' || !('orgId' in user)) {
      return null;
    }
    const { id, orgId } = user as { id?: UUID; orgId: UUID };
    return { userId: id ?? null, orgId };
  }
}
