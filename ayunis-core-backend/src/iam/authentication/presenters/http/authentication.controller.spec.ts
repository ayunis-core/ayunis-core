import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationController } from './authentication.controller';
import { LoginUseCase } from '../../application/use-cases/login/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token/refresh-token.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user/register-user.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user/get-current-user.use-case';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { UserRole } from '../../../users/domain/value-objects/role.object';
import { ActiveUser } from '../../domain/active-user.entity';
import { AuthTokens } from '../../domain/auth-tokens.entity';
import { HttpStatus } from '@nestjs/common';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let mockLoginUseCase: Partial<LoginUseCase>;
  let mockRefreshTokenUseCase: Partial<RefreshTokenUseCase>;
  let mockRegisterUserUseCase: Partial<RegisterUserUseCase>;
  let mockGetCurrentUserUseCase: Partial<GetCurrentUserUseCase>;
  let mockConfigService: Partial<ConfigService>;
  let mockJwtService: Partial<JwtService>;

  beforeEach(async () => {
    mockLoginUseCase = {
      execute: jest.fn(),
    };
    mockRefreshTokenUseCase = {
      execute: jest.fn(),
    };
    mockRegisterUserUseCase = {
      execute: jest.fn(),
    };
    mockGetCurrentUserUseCase = {
      execute: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn(),
    };
    mockJwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        { provide: LoginUseCase, useValue: mockLoginUseCase },
        { provide: RefreshTokenUseCase, useValue: mockRefreshTokenUseCase },
        { provide: RegisterUserUseCase, useValue: mockRegisterUserUseCase },
        { provide: GetCurrentUserUseCase, useValue: mockGetCurrentUserUseCase },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('me', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockRequest = {
        cookies: {},
      };
      mockResponse = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
      };
    });

    it('should return user info when access token is valid', async () => {
      const mockUser = new ActiveUser(
        'user-id' as any,
        'test@example.com',
        UserRole.USER,
        'org-id' as any,
      );

      // Mock config
      jest.spyOn(mockConfigService, 'get').mockImplementation((key) => {
        if (key === 'auth.cookie.accessTokenName') return 'access_token';
        if (key === 'auth.cookie.refreshTokenName') return 'refresh_token';
        return null;
      });

      // Mock cookies
      mockRequest.cookies = {
        access_token: 'valid-access-token',
        refresh_token: 'valid-refresh-token',
      };

      // Mock use case
      jest
        .spyOn(mockGetCurrentUserUseCase, 'execute')
        .mockResolvedValue(mockUser);

      await controller.me(mockRequest as Request, mockResponse as Response);

      expect(mockGetCurrentUserUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'valid-access-token' }),
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        email: 'test@example.com',
        role: UserRole.USER,
      });
    });

    it('should refresh tokens and return user info when access token is invalid but refresh token is valid', async () => {
      const mockUser = new ActiveUser(
        'user-id' as any,
        'test@example.com',
        UserRole.ADMIN,
        'org-id' as any,
      );
      const mockTokens = new AuthTokens(
        'new-access-token',
        'new-refresh-token',
      );

      // Mock config with all required values
      jest
        .spyOn(mockConfigService, 'get')
        .mockImplementation((key, defaultValue) => {
          if (key === 'auth.cookie.accessTokenName') return 'access_token';
          if (key === 'auth.cookie.refreshTokenName') return 'refresh_token';
          if (key === 'auth.jwt.expiresIn') return '1h';
          if (key === 'auth.jwt.refreshTokenExpiresIn') return '7d';
          if (key === 'auth.cookie.httpOnly') return true;
          if (key === 'auth.cookie.secure') return false;
          if (key === 'auth.cookie.sameSite') return 'lax';
          return defaultValue || null;
        });

      // Mock cookies
      mockRequest.cookies = {
        access_token: 'expired-access-token',
        refresh_token: 'valid-refresh-token',
      };

      // Mock first call to getCurrentUser (with expired token) to fail
      // Mock second call to getCurrentUser (with new token) to succeed
      jest
        .spyOn(mockGetCurrentUserUseCase, 'execute')
        .mockRejectedValueOnce(new Error('Token expired'))
        .mockResolvedValueOnce(mockUser);

      jest
        .spyOn(mockRefreshTokenUseCase, 'execute')
        .mockResolvedValue(mockTokens);

      await controller.me(mockRequest as Request, mockResponse as Response);

      expect(mockRefreshTokenUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'valid-refresh-token' }),
      );
      expect(mockGetCurrentUserUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({
        email: 'test@example.com',
        role: UserRole.ADMIN,
      });
    });

    it('should return 401 when no tokens are provided', async () => {
      // Mock config
      jest.spyOn(mockConfigService, 'get').mockImplementation((key) => {
        if (key === 'auth.cookie.accessTokenName') return 'access_token';
        if (key === 'auth.cookie.refreshTokenName') return 'refresh_token';
        return null;
      });

      // Mock empty cookies
      mockRequest.cookies = {};

      await controller.me(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated',
      });
    });

    it('should return 500 when authentication configuration is missing', async () => {
      // Mock config to return null for required values
      jest.spyOn(mockConfigService, 'get').mockReturnValue(null);

      await controller.me(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Authentication configuration error',
      });
    });

    it('should return 401 when refresh token is invalid', async () => {
      // Mock config
      jest.spyOn(mockConfigService, 'get').mockImplementation((key) => {
        if (key === 'auth.cookie.accessTokenName') return 'access_token';
        if (key === 'auth.cookie.refreshTokenName') return 'refresh_token';
        return null;
      });

      // Mock cookies
      mockRequest.cookies = {
        access_token: 'expired-access-token',
        refresh_token: 'invalid-refresh-token',
      };

      // Mock getCurrentUser to fail (expired access token)
      jest
        .spyOn(mockGetCurrentUserUseCase, 'execute')
        .mockRejectedValue(new Error('Token expired'));

      // Mock refreshToken to fail
      jest
        .spyOn(mockRefreshTokenUseCase, 'execute')
        .mockRejectedValue(new Error('Invalid refresh token'));

      await controller.me(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated',
      });
    });
  });
});
