import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsersRepository } from '../../ports/users.repository';
import { FindUsersByIdsQuery } from './find-users-by-ids.query';
import { User } from 'src/iam/users/domain/user.entity';
import { UserError, UserUnexpectedError } from '../../users.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class FindUsersByIdsUseCase {
  constructor(
    @InjectPinoLogger(FindUsersByIdsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindUsersByIdsQuery): Promise<User[]> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.info({ idCount: query.ids.length, orgId }, 'execute');

    try {
      return await this.usersRepository.findManyByIdsAndOrgId(query.ids, orgId);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserUnexpectedError(error as Error);
    }
  }
}
