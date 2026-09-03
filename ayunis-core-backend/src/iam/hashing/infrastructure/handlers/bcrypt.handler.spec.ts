import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { BcryptHandler } from './bcrypt.handler';

describe('BcryptHandler', () => {
  const build = async (configuredRounds: number | undefined) => {
    const logger = createLoggerMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BcryptHandler,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (_key: string, fallback: number) => configuredRounds ?? fallback,
            ),
          },
        },
      ],
    }).compile();

    return { handler: module.get(BcryptHandler), logger };
  };

  afterEach(() => jest.clearAllMocks());

  it('should log configured salt rounds as structured metadata', async () => {
    const { logger } = await build(12);

    expect(logger.log).toHaveBeenCalledWith({ saltRounds: 12 }, 'constructor');
  });

  it('should hash using the configured salt rounds', async () => {
    const { handler } = await build(12);

    const hash = await handler.hash('correct horse battery staple');

    // bcrypt encodes the cost factor into the hash: $2b$<rounds>$...
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('should default to 10 rounds when config is absent', async () => {
    const { handler } = await build(undefined);

    const hash = await handler.hash('correct horse battery staple');

    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('should round-trip compare a hashed value', async () => {
    const { handler } = await build(10);
    const hash = await handler.hash('s3cret');

    await expect(handler.compare('s3cret', hash)).resolves.toBe(true);
    await expect(handler.compare('wrong', hash)).resolves.toBe(false);
  });
});
