import { FirstStepsEmailListener } from './first-steps-email.listener';
import { UserCreatedEvent } from '../events/user-created.event';
import { User } from '../../domain/user.entity';
import { UserRole } from '../../domain/value-objects/role.object';
import type { FirstStepsTemplate } from 'src/common/email-templates/domain/email-template.entity';
import type { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import type { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

function makeUser(id?: UUID, orgId?: UUID): User {
  return new User({
    id: id ?? randomUUID(),
    email: 'maria.schmidt@gemeinde-musterstadt.de',
    emailVerified: true,
    passwordHash: 'hashed',
    role: UserRole.USER,
    orgId: orgId ?? randomUUID(),
    name: 'Maria Schmidt',
    hasAcceptedMarketing: false,
  });
}

describe('FirstStepsEmailListener', () => {
  let listener: FirstStepsEmailListener;
  let sendEmailUseCase: jest.Mocked<Pick<SendEmailUseCase, 'execute'>>;
  let renderTemplateUseCase: jest.Mocked<
    Pick<RenderTemplateUseCase, 'execute'>
  >;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();

    sendEmailUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    renderTemplateUseCase = {
      execute: jest.fn().mockReturnValue({
        html: '<html>First steps</html>',
        text: 'First steps plain text',
      }),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          'app.frontend.baseUrl': 'https://app.ayunis.com',
          'app.frontend.chatEndpoint': '/chat',
          'app.frontend.marketplaceEndpoint': '/marketplace',
          'app.frontend.knowledgeEndpoint': '/knowledge',
          'app.frontend.emailAssetsPath': '/email',
        };
        return config[key];
      }),
    };

    listener = new FirstStepsEmailListener(
      sendEmailUseCase as unknown as SendEmailUseCase,
      configService as unknown as ConfigService,
      renderTemplateUseCase as unknown as RenderTemplateUseCase,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not send email immediately', () => {
    const userId = randomUUID();
    const orgId = randomUUID();
    const event = new UserCreatedEvent(userId, orgId, makeUser(userId, orgId));

    listener.handleUserCreated(event);

    expect(sendEmailUseCase.execute).not.toHaveBeenCalled();
  });

  it('should send first-steps email after 5 minutes', async () => {
    const userId = randomUUID();
    const orgId = randomUUID();
    const user = makeUser(userId, orgId);
    const event = new UserCreatedEvent(userId, orgId, user);

    listener.handleUserCreated(event);

    jest.advanceTimersByTime(5 * 60 * 1000);
    await Promise.resolve();

    expect(renderTemplateUseCase.execute).toHaveBeenCalledTimes(1);
    expect(sendEmailUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'maria.schmidt@gemeinde-musterstadt.de',
        subject: 'Was Sie mit Ayunis Core machen können',
      }),
    );
  });

  it('should extract first name from full name', async () => {
    const userId = randomUUID();
    const orgId = randomUUID();
    const user = makeUser(userId, orgId);
    const event = new UserCreatedEvent(userId, orgId, user);

    listener.handleUserCreated(event);

    jest.advanceTimersByTime(5 * 60 * 1000);
    await Promise.resolve();

    const renderCall = renderTemplateUseCase.execute.mock.calls[0][0];
    const template = renderCall.template as FirstStepsTemplate;
    expect(template.content.firstName).toBe('Maria');
  });

  it('should not throw when email sending fails', async () => {
    sendEmailUseCase.execute.mockRejectedValue(new Error('SMTP timeout'));

    const userId = randomUUID();
    const orgId = randomUUID();
    const event = new UserCreatedEvent(userId, orgId, makeUser(userId, orgId));

    listener.handleUserCreated(event);

    jest.advanceTimersByTime(5 * 60 * 1000);
    await Promise.resolve();
  });

  it('should build asset URLs from config', async () => {
    const userId = randomUUID();
    const orgId = randomUUID();
    const user = makeUser(userId, orgId);
    const event = new UserCreatedEvent(userId, orgId, user);

    listener.handleUserCreated(event);

    jest.advanceTimersByTime(5 * 60 * 1000);
    await Promise.resolve();

    const renderCall = renderTemplateUseCase.execute.mock.calls[0][0];
    const template = renderCall.template as FirstStepsTemplate;
    expect(template.content.logoUrl).toBe(
      'https://app.ayunis.com/email/logo.png',
    );
    expect(template.content.chatUrl).toBe('https://app.ayunis.com/chat');
  });
});
