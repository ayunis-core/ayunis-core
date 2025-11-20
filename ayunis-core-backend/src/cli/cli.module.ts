import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { UsersModule } from 'src/iam/users/users.module';
import { InvitesModule } from 'src/iam/invites/invites.module';
import { ContextModule } from 'src/common/context/context.module';
import { DeleteUserCommand } from 'src/cli/application/commands/users/delete-user.command';
import { GetUserCommand } from 'src/cli/application/commands/users/get-user.command';
import { MakeSuperAdminCommand } from 'src/cli/application/commands/users/make-super-admin.command';
import { RemoveSuperAdminCommand } from 'src/cli/application/commands/users/remove-super-admin.command';
import { typeormConfig } from 'src/config/typeorm.config';
import dataSource from 'src/db/datasource';

/**
 * CLI Module for administrative commands
 *
 * NOTE: Seed commands have been moved to lightweight TypeScript scripts
 * in src/db/scripts/ to reduce memory usage. Use `npm run seed:minimal`
 * instead of CLI commands for seeding.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeormConfig],
    }),
    ClsModule.forRoot({
      global: true,
      plugins: [
        new ClsPluginTransactional({
          imports: [TypeOrmModule],
          adapter: new TransactionalAdapterTypeOrm({
            dataSourceToken: getDataSourceToken(),
          }),
        }),
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get('typeorm')!,
      dataSourceFactory: async () => {
        await dataSource.initialize();
        return dataSource;
      },
    }),
    ContextModule,
    UsersModule,
    InvitesModule,
  ],
  providers: [
    DeleteUserCommand,
    GetUserCommand,
    MakeSuperAdminCommand,
    RemoveSuperAdminCommand,
  ],
})
export class CliModule {}
