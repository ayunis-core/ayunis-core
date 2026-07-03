import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { InviteJwtService } from './invite-jwt.service';

describe('InviteJwtService', () => {
  let service: InviteJwtService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const inviteId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteJwtService,
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(InviteJwtService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should sign the invite token with the configured invite expiry', () => {
    configService.get.mockReturnValue('7d');
    jwtService.sign.mockReturnValue('signed-invite-token');

    const token = service.generateInviteToken({ inviteId });

    expect(configService.get).toHaveBeenCalledWith(
      'auth.jwt.inviteExpiresIn',
      '2d',
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { inviteId },
      { expiresIn: '7d' },
    );
    expect(token).toBe('signed-invite-token');
  });
});
