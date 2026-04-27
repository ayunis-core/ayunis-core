import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ValidateApiKeyUseCase } from '../use-cases/validate-api-key/validate-api-key.use-case';
import { ValidateApiKeyCommand } from '../use-cases/validate-api-key/validate-api-key.command';
import { ApiKeyError } from '../api-keys.errors';
import { ActiveApiKey } from 'src/iam/authentication/domain/active-api-key.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import 'src/iam/authentication/application/types/request.augmentation';

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(private readonly validateApiKeyUseCase: ValidateApiKeyUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header',
      );
    }

    const token = header.slice(BEARER_PREFIX.length).trim();

    try {
      const apiKey = await this.validateApiKeyUseCase.execute(
        new ValidateApiKeyCommand(token),
      );

      request.apiKey = new ActiveApiKey({
        apiKeyId: apiKey.id,
        label: apiKey.name,
        orgId: apiKey.orgId,
        role: UserRole.USER,
        systemRole: SystemRole.CUSTOMER,
      });

      return true;
    } catch (error) {
      if (error instanceof ApiKeyError) {
        throw error;
      }
      this.logger.error('Unexpected error during API key validation', error);
      throw new UnauthorizedException('API key authentication failed');
    }
  }
}
