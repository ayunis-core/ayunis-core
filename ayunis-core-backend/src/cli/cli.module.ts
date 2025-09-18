import { Module } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { SeedUsersCommand } from 'src/cli/application/commands/seed-users.command';
import { SeedModelsCommand } from 'src/cli/application/commands/seed-models.command';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { UsersModule } from 'src/iam/users/users.module';
import { ModelsModule } from 'src/domain/models/models.module';
import { SeedMinimalCommand } from 'src/cli/application/commands/seed-minimal.command';
import { HashingModule } from 'src/iam/hashing/hashing.module';

@Module({
  imports: [AppModule, UsersModule, OrgsModule, ModelsModule, HashingModule],
  providers: [SeedUsersCommand, SeedModelsCommand, SeedMinimalCommand],
})
export class CliModule {}
