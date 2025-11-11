import { UUID } from 'crypto';
import { Command, CommandRunner, Option } from 'nest-commander';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

type Options = { userId: UUID };

@Command({
  name: 'users:make-super-admin',
  description: 'Make a user a super admin',
})
export class MakeSuperAdminCommand extends CommandRunner {
  constructor(private readonly usersRepository: UsersRepository) {
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
    user.systemRole = SystemRole.SUPER_ADMIN;
    await this.usersRepository.update(user);
  }
}
