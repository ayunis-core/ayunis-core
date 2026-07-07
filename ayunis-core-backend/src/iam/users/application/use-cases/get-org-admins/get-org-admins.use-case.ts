import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { GetOrgAdminsQuery } from './get-org-admins.query';
import { UserUnexpectedError } from '../../users.errors';

/**
 * Returns all users with the org-level ADMIN role for a given organization.
 * Context-free (takes an explicit orgId) so it can be called from background
 * jobs that run without a request context.
 */
@Injectable()
export class GetOrgAdminsUseCase {
  private readonly logger = new Logger(GetOrgAdminsUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: GetOrgAdminsQuery): Promise<User[]> {
    this.logger.log('execute', { orgId: query.orgId });
    try {
      return await this.usersRepository.findAdminsByOrgId(query.orgId);
    } catch (error) {
      this.logger.error('Error finding org admins', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UserUnexpectedError(error as Error);
    }
  }
}
