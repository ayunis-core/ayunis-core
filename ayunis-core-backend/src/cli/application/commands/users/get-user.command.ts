import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { Command, CommandRunner, Option } from 'nest-commander';
import { User } from 'src/iam/users/domain/user.entity';

type Options = { email: string };

@Command({ name: 'users:get', description: 'Get a user' })
export class GetUserCommand extends CommandRunner {
  constructor(private readonly usersRepository: UsersRepository) {
    super();
  }

  @Option({ flags: '-e, --email <email>', description: 'Email' })
  parseEmail(val: string): string {
    return val;
  }

  async run(_: string[], options: Options): Promise<void> {
    let user: User | null = null;
    user = await this.usersRepository.findOneByEmail(options.email);
    if (!user) {
      throw new Error('User not found');
    }
    console.log(user);
  }
}
