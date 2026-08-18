import { getLoggerToken } from 'nestjs-pino';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { EmailArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { CreateEmailTool } from '../../domain/tools/create-email-tool.entity';
import { CreateEmailToolHandler } from './create-email-tool.handler';

describe('CreateEmailToolHandler', () => {
  let handler: CreateEmailToolHandler;
  let createArtifact: jest.Mocked<CreateArtifactUseCase>;

  beforeEach(async () => {
    createArtifact = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateArtifactUseCase>;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateEmailToolHandler,
        { provide: CreateArtifactUseCase, useValue: createArtifact },
        {
          provide: getLoggerToken(CreateEmailToolHandler.name),
          useValue: createPinoLoggerMock(),
        },
      ],
    }).compile();
    handler = module.get(CreateEmailToolHandler);
  });

  it('creates a versioned email artifact from the tool input', async () => {
    const artifact = new EmailArtifact({
      id: randomUUID(),
      threadId: randomUUID(),
      userId: randomUUID(),
      title: 'Project update',
    });
    createArtifact.execute.mockResolvedValue(artifact);

    await handler.execute({
      tool: new CreateEmailTool(),
      input: {
        subject: 'Project update',
        to: ['alice@example.com'],
        body: 'Hello Alice',
      },
      context: { threadId: artifact.threadId, orgId: randomUUID() },
    });

    const command = createArtifact.execute.mock.calls[0][0];
    expect(command.type).toBe(ArtifactType.EMAIL);
    expect(command.title).toBe('Project update');
    expect(command.authorType).toBe(AuthorType.ASSISTANT);
    expect(JSON.parse(command.content)).toMatchObject({
      format: 'email-v1',
      subject: 'Project update',
      to: ['alice@example.com'],
      cc: [],
      bcc: [],
      body: 'Hello Alice',
    });
  });
});
