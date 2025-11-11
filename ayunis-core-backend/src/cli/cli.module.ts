import { Module } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { UsersModule } from 'src/iam/users/users.module';
import { InvitesModule } from 'src/iam/invites/invites.module';
import { ModelsModule } from 'src/domain/models/models.module';
import { HashingModule } from 'src/iam/hashing/hashing.module';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { SeedMinimalCommand } from 'src/cli/application/commands/seed/seed-minimal.command';
import { SeedUsersCommand } from 'src/cli/application/commands/seed/seed-users.command';
import { SeedModelsCommand } from 'src/cli/application/commands/seed/seed-models.command';
import { DeleteUserCommand } from 'src/cli/application/commands/users/delete-user.command';
import { GetUserCommand } from 'src/cli/application/commands/users/get-user.command';
import { MakeSuperAdminCommand } from 'src/cli/application/commands/users/make-super-admin.command';
import { RemoveSuperAdminCommand } from 'src/cli/application/commands/users/remove-super-admin.command';

@Module({
  imports: [
    AppModule,
    UsersModule,
    InvitesModule,
    OrgsModule,
    ModelsModule,
    HashingModule,
    SubscriptionsModule,
  ],
  providers: [
    SeedUsersCommand,
    SeedModelsCommand,
    SeedMinimalCommand,
    DeleteUserCommand,
    GetUserCommand,
    MakeSuperAdminCommand,
    RemoveSuperAdminCommand,
  ],
})
export class CliModule {}
