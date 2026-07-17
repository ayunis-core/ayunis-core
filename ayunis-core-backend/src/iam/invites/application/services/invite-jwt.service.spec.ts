import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { InviteJwtService, INVITE_TOKEN_TYPE } from './invite-jwt.service';
import { InvalidInviteTokenError } from '../invites.errors';

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
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should sign the invite token with a type claim and the configured expiry', () => {
    configService.get.mockReturnValue('7d');
    jwtService.sign.mockReturnValue('signed-invite-token');

    const token = service.generateInviteToken({ inviteId });

    expect(configService.get).toHaveBeenCalledWith(
      'auth.jwt.inviteExpiresIn',
      '2d',
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { inviteId, type: INVITE_TOKEN_TYPE },
      { expiresIn: '7d' },
    );
    expect(token).toBe('signed-invite-token');
  });

  it('should verify a properly typed invite token', () => {
    jwtService.verify.mockReturnValue({ inviteId, type: INVITE_TOKEN_TYPE });

    expect(service.verifyInviteToken('token')).toEqual({
      inviteId,
      type: INVITE_TOKEN_TYPE,
    });
  });

  it('should accept a legacy untyped invite token during the grace window', () => {
    jwtService.verify.mockReturnValue({ inviteId });

    expect(service.verifyInviteToken('legacy-token')).toEqual({
      inviteId,
      type: INVITE_TOKEN_TYPE,
    });
  });

  it('should reject a token typed as something other than invite', () => {
    jwtService.verify.mockReturnValue({ inviteId, type: 'password_reset' });

    expect(() => service.verifyInviteToken('foreign-token')).toThrow(
      InvalidInviteTokenError,
    );
  });

  it('should reject a token without an inviteId', () => {
    jwtService.verify.mockReturnValue({
      userId: inviteId,
      email: 'user@example.com',
    });

    expect(() => service.verifyInviteToken('reset-shaped-token')).toThrow(
      InvalidInviteTokenError,
    );
  });
});
