import { Command, CommandRunner, Option } from 'nest-commander';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { HashingHandler } from 'src/iam/hashing/application/ports/hashing.handler';

function ensureNonProduction() {
  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error('Seeding is disabled in production');
  }
}
type Options = { adminEmail: string; orgName: string; adminPassword: string };

@Command({ name: 'seed:users', description: 'Seed users only' })
export class SeedUsersCommand extends CommandRunner {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly orgsRepo: OrgsRepository,
    private readonly hashingHandler: HashingHandler,
  ) {
    super();
  }

  @Option({
    flags: '-e, --admin-email <email>',
    defaultValue: 'admin@demo.local',
  })
  parseAdminEmail(val: string): string {
    return val;
  }

  @Option({
    flags: '-n, --org-name <name>',
    defaultValue: 'Demo Org',
  })
  parseOrgName(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --admin-password <password>',
    defaultValue: 'admin',
  })
  parseAdminPassword(val: string): string {
    return val;
  }

  async run(_: string[], options: Options): Promise<void> {
    ensureNonProduction();
    const org = await this.ensureOrg(options.orgName);
    await this.ensureAdminUser(org, options.adminEmail, options.adminPassword);
    console.log(
      `Created user: ${options.adminEmail} with password: ${options.adminPassword}`,
    );
  }

  private async ensureOrg(name: string): Promise<Org> {
    try {
      const anyExisting = await this.orgsRepo.findAllIds().catch(() => []);
      for (const id of anyExisting) {
        const o = await this.orgsRepo.findById(id);
        if (o.name === name) return o;
      }
    } catch {
      // ignore
    }
    return this.orgsRepo.create(new Org({ name }));
  }

  private async ensureAdminUser(
    org: Org,
    email: string,
    password: string,
  ): Promise<User> {
    const existing = await this.usersRepo.findOneByEmail(email);
    if (existing) {
      console.log(`User already exists: ${email}`);
      return existing;
    }

    // Properly hash the password using bcrypt
    const passwordHash = await this.hashingHandler.hash(password);

    const user = new User({
      email,
      emailVerified: true,
      passwordHash,
      role: UserRole.ADMIN,
      orgId: org.id,
      name: 'Admin',
      hasAcceptedMarketing: true,
    });
    return this.usersRepo.create(user);
  }
}
