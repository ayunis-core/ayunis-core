import { Test, TestingModule } from '@nestjs/testing';
import { LoginUseCase } from './login.use-case';
import { LoginCommand } from './login.command';
import { AuthenticationRepository } from '../../ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from '../../tokens/authentication-repository.token';
import { ActiveUser } from '../../../domain/active-user.entity';
import { AuthTokens } from '../../../domain/auth-tokens.entity';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { SystemRole } from '../../../../users/domain/value-objects/system-role.enum';
import { UUID } from 'crypto';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockAuthRepository: Partial<AuthenticationRepository>;

  beforeEach(async () => {
    mockAuthRepository = {
      generateTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        {
          provide: AUTHENTICATION_REPOSITORY,
          useValue: mockAuthRepository,
        },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should login user successfully', async () => {
    const activeUser = new ActiveUser({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      emailVerified: false,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
      orgId: 'org-id' as UUID,
      name: 'name',
    });
    const command = new LoginCommand(activeUser);
    const expectedTokens = new AuthTokens('access-token', 'refresh-token');

    jest
      .spyOn(mockAuthRepository, 'generateTokens')
      .mockResolvedValue(expectedTokens);

    const result = await useCase.execute(command);

    expect(result).toBe(expectedTokens);
    expect(mockAuthRepository.generateTokens).toHaveBeenCalledWith(activeUser);
  });
});
