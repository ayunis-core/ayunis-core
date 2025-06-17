import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthenticationModule } from './authentication/authentication.module';
import { InvitesModule } from './invites/invites.module';
import {
  authenticationConfig,
  AuthProvider,
} from '../config/authentication.config';
import { HashingModule } from './hashing/hashing.module';
import { UsersModule } from './users/users.module';
import { OrgsModule } from './orgs/orgs.module';
import { AuthorizationModule } from './authorization/authorization.module';

@Module({})
export class IamModule {
  static register(options?: { authProvider?: AuthProvider; authConfig?: any }) {
    return {
      module: IamModule,
      imports: [
        ConfigModule.forFeature(authenticationConfig),
        AuthenticationModule.register({
          provider: options?.authProvider,
          ...options?.authConfig,
        }),
        AuthorizationModule,
        HashingModule,
        InvitesModule,
        UsersModule,
        OrgsModule,
      ],
      exports: [
        AuthenticationModule,
        AuthorizationModule,
        HashingModule,
        InvitesModule,
        UsersModule,
        OrgsModule,
      ],
    };
  }
}
