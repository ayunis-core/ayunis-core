import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GetCurrentUserCommand } from './get-current-user.command';
import { ActiveUser } from '../../../domain/active-user.entity';
import { InvalidTokenError } from '../../authentication.errors';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { UUID } from 'crypto';

interface JwtPayload {
  sub: UUID;
  email: string;
  role: UserRole;
  orgId: UUID;
  name: string;
}

@Injectable()
export class GetCurrentUserUseCase {
  private readonly logger = new Logger(GetCurrentUserUseCase.name);

  constructor(private readonly jwtService: JwtService) {}

  async execute(command: GetCurrentUserCommand): Promise<ActiveUser> {
    this.logger.log('getCurrentUser');

    try {
      const payload = this.jwtService.verify<JwtPayload>(command.accessToken);

      if (
        !payload ||
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

      return new ActiveUser(
        payload.sub,
        payload.email,
        payload.role,
        payload.orgId,
        payload.name,
      );
    } catch (error: unknown) {
      this.logger.error('Token verification failed', { error });
      throw new InvalidTokenError('Unable to verify access token');
    }
  }
}
