import { Command, CommandRunner } from 'nest-commander';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { Option } from 'nest-commander';
import { UUID } from 'crypto';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';

type Options = { userId: UUID };

@Command({ name: 'users:delete', description: 'Delete a user' })
export class DeleteUserCommand extends CommandRunner {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly invitesRepository: InvitesRepository,
  ) {
    super();
  }

  @Option({ flags: '-i, --userId <userId>', description: 'User ID' })
  parseUserId(val: UUID): UUID {
    return val;
  }

  async run(_: string[], options: Options): Promise<void> {
    const user = await this.usersRepository.findOneById(options.userId);
    if (!user) {
      throw new Error('User not found');
    }
    const userToDelete = await this.usersRepository.findOneById(options.userId);
    if (!userToDelete) {
      throw new Error('User not found');
    }
    await this.usersRepository.delete(options.userId);
    const inviteToDelete = await this.invitesRepository.findOneByEmail(
      userToDelete.email,
    );
    if (inviteToDelete) {
      await this.invitesRepository.delete(inviteToDelete.id);
    }
  }
}
