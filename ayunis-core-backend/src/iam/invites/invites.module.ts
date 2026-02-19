import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';

// Entities and Infrastructure
import { InviteRecord } from './infrastructure/persistence/local/schema/invite.record';
import { InviteMapper } from './infrastructure/persistence/local/mappers/invite.mapper';
import { LocalInvitesRepository } from './infrastructure/persistence/local/local-invites.repository';

// Ports
import { InvitesRepository } from './application/ports/invites.repository';

// Services
import { InviteJwtService } from './application/services/invite-jwt.service';

// Use Cases
import { CreateInviteUseCase } from './application/use-cases/create-invite/create-invite.use-case';
import { CreateBulkInvitesUseCase } from './application/use-cases/create-bulk-invites/create-bulk-invites.use-case';
import { AcceptInviteUseCase } from './application/use-cases/accept-invite/accept-invite.use-case';
import { DeleteInviteUseCase } from './application/use-cases/delete-invite/delete-invite.use-case';
import { GetInvitesByOrgUseCase } from './application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { GetInviteByTokenUseCase } from './application/use-cases/get-invite-by-token/get-invite-by-token.use-case';
import { SendInvitationEmailUseCase } from './application/use-cases/send-invitation-email/send-invitation-email.use-case';
import { DeleteInviteByEmailUseCase } from './application/use-cases/delete-invite-by-email/delete-invite-by-email.use-case';
import { DeleteAllPendingInvitesUseCase } from './application/use-cases/delete-all-pending-invites/delete-all-pending-invites.use-case';
import { ResendExpiredInviteUseCase } from './application/use-cases/resend-expired-invite/resend-expired-invite.use-case';

// Presenters
import { InvitesController } from './presenters/http/invites.controller';
import { InviteResponseMapper } from './presenters/http/mappers/invite-response.mapper';

// External modules
import { OrgsModule } from '../orgs/orgs.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmailsModule } from '../../common/emails/emails.module';
import { EmailTemplatesModule } from '../../common/email-templates/email-templates.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([InviteRecord]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          'auth.jwt.secret',
          'dev-secret-change-in-production',
        ),
        signOptions: {
          expiresIn: configService.get<StringValue>(
            'auth.jwt.inviteExpiresIn',
            '7d',
          ) as StringValue,
        },
      }),
    }),
    OrgsModule,
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => UsersModule),
    EmailsModule,
    EmailTemplatesModule,
  ],
  providers: [
    // Mappers
    InviteMapper,
    InviteResponseMapper,

    // Repository
    {
      provide: InvitesRepository,
      useClass: LocalInvitesRepository,
    },

    // Services
    InviteJwtService,

    // Use Cases
    CreateInviteUseCase,
    CreateBulkInvitesUseCase,
    AcceptInviteUseCase,
    DeleteInviteUseCase,
    DeleteAllPendingInvitesUseCase,
    ResendExpiredInviteUseCase,
    GetInvitesByOrgUseCase,
    GetInviteByTokenUseCase,
    SendInvitationEmailUseCase,
    DeleteInviteByEmailUseCase,
  ],
  controllers: [InvitesController],
  exports: [
    InvitesRepository, // Export repository for CLI user management
    CreateInviteUseCase,
    AcceptInviteUseCase,
    DeleteInviteUseCase,
    GetInvitesByOrgUseCase,
    GetInviteByTokenUseCase,
    SendInvitationEmailUseCase,
    InviteJwtService,
    DeleteInviteByEmailUseCase,
  ],
})
export class InvitesModule {}
