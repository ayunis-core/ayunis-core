import { Module } from '@nestjs/common';
import { UsersModule } from 'src/iam/users/users.module';
import { InvitesModule } from 'src/iam/invites/invites.module';
import { DeleteUserCommand } from 'src/cli/application/commands/users/delete-user.command';
import { GetUserCommand } from 'src/cli/application/commands/users/get-user.command';
import { MakeSuperAdminCommand } from 'src/cli/application/commands/users/make-super-admin.command';
import { RemoveSuperAdminCommand } from 'src/cli/application/commands/users/remove-super-admin.command';

/**
 * CLI Module for administrative commands
 *
 * NOTE: Seed commands have been moved to lightweight TypeScript scripts
 * in src/db/scripts/ to reduce memory usage. Use `npm run seed:minimal`
 * instead of CLI commands for seeding.
 */
@Module({
  imports: [UsersModule, InvitesModule],
  providers: [
    DeleteUserCommand,
    GetUserCommand,
    MakeSuperAdminCommand,
    RemoveSuperAdminCommand,
  ],
})
export class CliModule {}
