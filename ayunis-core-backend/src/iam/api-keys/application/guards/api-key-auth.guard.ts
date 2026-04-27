import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ValidateApiKeyUseCase } from '../use-cases/validate-api-key/validate-api-key.use-case';
import { ValidateApiKeyCommand } from '../use-cases/validate-api-key/validate-api-key.command';
import { ActiveApiKey } from 'src/iam/authentication/domain/active-api-key.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
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
  }
}
