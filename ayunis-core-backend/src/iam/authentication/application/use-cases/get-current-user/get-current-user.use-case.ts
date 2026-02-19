import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GetCurrentUserCommand } from './get-current-user.command';
import { ActiveUser } from '../../../domain/active-user.entity';
import { InvalidTokenError } from '../../authentication.errors';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { UUID } from 'crypto';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { ApplicationError } from 'src/common/errors/base.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

interface JwtPayload {
  sub: UUID;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  systemRole: SystemRole;
  orgId: UUID;
  name: string;
}

@Injectable()
export class GetCurrentUserUseCase {
  private readonly logger = new Logger(GetCurrentUserUseCase.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
  ) {}

  async execute(command: GetCurrentUserCommand): Promise<ActiveUser> {
    this.logger.log('getCurrentUser');

    try {
      const payload = this.jwtService.verify<JwtPayload>(command.accessToken);

      if (
        !payload.sub ||
        !payload.email ||
        !payload.role ||
        !payload.orgId ||
        !payload.name
      ) {
        throw new InvalidTokenError('Invalid token payload');
      }

      this.logger.debug('Token verified successfully', {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      });

      const user = await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(payload.sub),
      );

      return new ActiveUser({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        systemRole: user.systemRole,
        orgId: user.orgId,
        name: user.name,
      });
    } catch (error: unknown) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Token verification failed', { error });
      throw new InvalidTokenError('Unable to verify access token');
    }
  }
}
