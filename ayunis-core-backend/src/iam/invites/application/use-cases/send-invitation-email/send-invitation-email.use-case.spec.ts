import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import type { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import type { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import type { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import type { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SendInvitationEmailCommand } from './send-invitation-email.command';
import { SendInvitationEmailUseCase } from './send-invitation-email.use-case';

const INVITE_ID = '123e4567-e89b-12d3-a456-426614174010' as UUID;
const ORG_ID = '123e4567-e89b-12d3-a456-426614174011' as UUID;
const INVITER_ID = '123e4567-e89b-12d3-a456-426614174012' as UUID;
const RECIPIENT_EMAIL = 'maria.muster@stadt-velburg.de';

describe('SendInvitationEmailUseCase', () => {
  const sendEmail = { execute: jest.fn() };
  const config = { get: jest.fn() };
  const renderTemplate = { execute: jest.fn() };
  const findOrgById = { execute: jest.fn() };
  const findUserById = { execute: jest.fn() };
  const logger = createLoggerMock();

  const invite = new Invite({
    id: INVITE_ID,
    email: RECIPIENT_EMAIL,
    orgId: ORG_ID,
    role: UserRole.USER,
    inviterId: INVITER_ID,
    expiresAt: new Date('2026-09-16T08:00:00.000Z'),
  });

  const useCase = new SendInvitationEmailUseCase(
    sendEmail as unknown as SendEmailUseCase,
    config as unknown as ConfigService,
    renderTemplate as unknown as RenderTemplateUseCase,
    findOrgById as unknown as FindOrgByIdUseCase,
    findUserById as unknown as FindUserByIdUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) =>
      key === 'app.frontend.baseUrl'
        ? 'https://core.ayunis.de'
        : '/email-assets',
    );
    findOrgById.execute.mockResolvedValue(
      new Org({ id: ORG_ID, name: 'Stadt Velburg' }),
    );
    findUserById.execute.mockResolvedValue(
      new User({
        id: INVITER_ID,
        email: 'admin@stadt-velburg.de',
        emailVerified: true,
        passwordHash: null,
        role: UserRole.ADMIN,
        orgId: ORG_ID,
        name: 'Velburg Admin',
        hasAcceptedMarketing: false,
      }),
    );
    renderTemplate.execute.mockReturnValue({
      html: '<html>Einladung</html>',
      text: 'Einladung',
    });
    sendEmail.execute.mockResolvedValue({
      messageId: '<invite-123@mails.ayunis.com>',
      acceptedRecipients: [RECIPIENT_EMAIL],
      rejectedRecipients: [],
      pendingRecipients: [],
      statusCode: 250,
    });
  });

  it('logs which invitation is being prepared', async () => {
    await useCase.execute(
      new SendInvitationEmailCommand(
        invite,
        'https://core.ayunis.de/invites/accept?token=secret',
      ),
    );

    expect(logger.log).toHaveBeenCalledWith(
      {
        inviteId: INVITE_ID,
        email: RECIPIENT_EMAIL,
        orgId: ORG_ID,
        inviterId: INVITER_ID,
        role: UserRole.USER,
      },
      'Preparing invitation email',
    );
  });

  it('logs when SMTP handover completes', async () => {
    await useCase.execute(
      new SendInvitationEmailCommand(
        invite,
        'https://core.ayunis.de/invites/accept?token=secret',
      ),
    );

    expect(logger.log).toHaveBeenCalledWith(
      {
        inviteId: INVITE_ID,
        email: RECIPIENT_EMAIL,
        orgId: ORG_ID,
        smtpMessageId: '<invite-123@mails.ayunis.com>',
        smtpStatusCode: 250,
        acceptedRecipientCount: 1,
        rejectedRecipientCount: 0,
        pendingRecipientCount: 0,
      },
      'Invitation email handed to SMTP transport',
    );
  });
});
