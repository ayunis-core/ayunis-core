import { Command, CommandRunner } from 'nest-commander';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { HashingHandler } from 'src/iam/hashing/application/ports/hashing.handler';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';

function ensureNonProduction() {
  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error('Seeding is disabled in production');
  }
}

@Command({ name: 'seed:minimal', description: 'Seed minimal data' })
export class SeedMinimalCommand extends CommandRunner {
  private readonly orgName = 'Demo Org';
  private readonly adminEmail = 'admin@demo.local';
  private readonly adminPassword = 'admin';
  private readonly adminName = 'Admin';
  private readonly modelName = 'gpt-4o-mini';
  private readonly modelDisplayName = 'GPT-4o mini';
  private readonly modelProvider = ModelProvider.OPENAI;

  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly orgsRepo: OrgsRepository,
    private readonly modelsRepo: ModelsRepository,
    private readonly permittedProvidersRepo: PermittedProvidersRepository,
    private readonly permittedModelsRepo: PermittedModelsRepository,
    private readonly hashingHandler: HashingHandler,
  ) {
    super();
  }

  async run(): Promise<void> {
    ensureNonProduction();

    // Create available model
    const model = new LanguageModel({
      name: this.modelName,
      displayName: this.modelDisplayName,
      provider: this.modelProvider,
      canStream: true,
      isReasoning: false,
      isArchived: false,
    });
    await this.modelsRepo.save(model);

    // Create org & admin user
    const org = await this.orgsRepo.create(new Org({ name: this.orgName }));
    const passwordHash = await this.hashingHandler.hash(this.adminPassword);
    await this.usersRepo.create(
      new User({
        email: this.adminEmail,
        passwordHash,
        orgId: org.id,
        emailVerified: true,
        role: UserRole.ADMIN,
        name: this.adminName,
      }),
    );

    // Create permitted provider & permitted model
    await this.permittedProvidersRepo.create(
      org.id,
      new PermittedProvider({
        provider: this.modelProvider,
        orgId: org.id,
      }),
    );
    await this.permittedModelsRepo.create(
      new PermittedModel({
        model,
        orgId: org.id,
      }),
    );
  }
}
