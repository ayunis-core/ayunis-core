import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { CreateShareUseCase } from './create-share.use-case';
import { CreateOrgSkillShareCommand } from './create-share.command';
import { ContextService } from 'src/common/context/services/context.service';
import { SharesRepository } from 'src/domain/shares/application/ports/shares-repository.port';
import { ShareAuthorizationFactory } from 'src/domain/shares/application/factories/share-authorization.factory';
import type { ShareAuthorizationStrategy } from 'src/domain/shares/application/ports/share-authorization-strategy.port';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import {
  SkillShare,
  KnowledgeBaseShare,
} from 'src/domain/shares/domain/share.entity';
import { OrgShareScope } from 'src/domain/shares/domain/share-scope.entity';
import { randomUUID } from 'crypto';
import { CheckUserTeamMembershipUseCase } from 'src/iam/teams/application/use-cases/check-user-team-membership/check-user-team-membership.use-case';
import {
  CreateOrgKnowledgeBaseShareCommand,
  CreateTeamKnowledgeBaseShareCommand,
} from './create-share.command';
import { TeamShareScope } from 'src/domain/shares/domain/share-scope.entity';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { CreateTeamSkillShareCommand } from './create-share.command';

describe('CreateShareUseCase', () => {
  let useCase: CreateShareUseCase;
  let contextService: ContextService;
  let repository: SharesRepository;
  let authorizationFactory: ShareAuthorizationFactory;
  let authorizationStrategy: ShareAuthorizationStrategy;
  let checkUserTeamMembershipUseCase: CheckUserTeamMembershipUseCase;
  let hasPermissionUseCase: HasPermissionUseCase;

  const mockUserId = randomUUID();
  const mockOrgId = randomUUID();
  const mockSkillId = randomUUID();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateShareUseCase,
        {
          provide: ContextService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SharesRepository,
          useValue: {
            create: jest.fn(),
            findByEntityAndScope: jest.fn(),
          },
        },
        {
          provide: ShareAuthorizationFactory,
          useValue: {
            getStrategy: jest.fn(),
          },
        },
        {
          provide: CheckUserTeamMembershipUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: HasPermissionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<CreateShareUseCase>(CreateShareUseCase);
    contextService = module.get<ContextService>(ContextService);
    repository = module.get<SharesRepository>(SharesRepository);
    authorizationFactory = module.get<ShareAuthorizationFactory>(
      ShareAuthorizationFactory,
    );

    checkUserTeamMembershipUseCase = module.get<CheckUserTeamMembershipUseCase>(
      CheckUserTeamMembershipUseCase,
    );
    hasPermissionUseCase =
      module.get<HasPermissionUseCase>(HasPermissionUseCase);

    // Create mock authorization strategy
    authorizationStrategy = {
      canViewShares: jest.fn(),
      canCreateShare: jest.fn(),
      canDeleteShare: jest.fn(),
    };
  });
  beforeEach(() => {
    jest.clearAllMocks();
    (hasPermissionUseCase.execute as jest.Mock).mockResolvedValue(true);
  });

  const mockUserContext = () => {
    (contextService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'userId') return mockUserId;
      if (key === 'orgId') return mockOrgId;
      if (key === 'role') return UserRole.USER;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return null;
    });
  };

  const grantOnly = (granted: Permission[]) => {
    (hasPermissionUseCase.execute as jest.Mock).mockImplementation(
      ({ permission }: { permission: Permission }) =>
        Promise.resolve(granted.includes(permission)),
    );
  };

  const allowShareCreation = () => {
    (authorizationFactory.getStrategy as jest.Mock).mockReturnValue(
      authorizationStrategy,
    );
    (authorizationStrategy.canCreateShare as jest.Mock).mockResolvedValue(true);
    (checkUserTeamMembershipUseCase.execute as jest.Mock).mockResolvedValue(
      true,
    );
    (repository.findByEntityAndScope as jest.Mock).mockResolvedValue(null);
    (repository.create as jest.Mock).mockResolvedValue(undefined);
  };

  describe('scope permissions', () => {
    const teamId = randomUUID();
    const knowledgeBaseId = randomUUID();

    beforeEach(() => {
      mockUserContext();
      allowShareCreation();
    });

    it('rejects a team skill share without request_skill_transfer', async () => {
      grantOnly([Permission.REQUEST_SKILL_TRANSFER_ORG]);

      await expect(
        useCase.execute(new CreateTeamSkillShareCommand(mockSkillId, teamId)),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates an org skill share with only request_skill_transfer_org', async () => {
      grantOnly([Permission.REQUEST_SKILL_TRANSFER_ORG]);

      await expect(
        useCase.execute(new CreateOrgSkillShareCommand(mockSkillId)),
      ).resolves.toBeInstanceOf(SkillShare);
    });

    it('rejects an org skill share without request_skill_transfer_org', async () => {
      grantOnly([Permission.REQUEST_SKILL_TRANSFER]);

      await expect(
        useCase.execute(new CreateOrgSkillShareCommand(mockSkillId)),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates a team skill share with only request_skill_transfer', async () => {
      grantOnly([Permission.REQUEST_SKILL_TRANSFER]);

      await expect(
        useCase.execute(new CreateTeamSkillShareCommand(mockSkillId, teamId)),
      ).resolves.toBeInstanceOf(SkillShare);
    });

    it('checks the knowledge permissions for knowledge base shares', async () => {
      grantOnly([Permission.REQUEST_SKILL_TRANSFER_ORG]);

      await expect(
        useCase.execute(
          new CreateOrgKnowledgeBaseShareCommand(knowledgeBaseId),
        ),
      ).rejects.toThrow(ForbiddenException);

      grantOnly([Permission.REQUEST_KNOWLEDGE_TRANSFER]);

      await expect(
        useCase.execute(
          new CreateTeamKnowledgeBaseShareCommand(knowledgeBaseId, teamId),
        ),
      ).resolves.toBeInstanceOf(KnowledgeBaseShare);
    });
  });

  describe('execute', () => {
    it('should create an org-scoped share when user owns the skill', async () => {
      // Arrange
      const command = new CreateOrgSkillShareCommand(mockSkillId);

      mockUserContext();

      (authorizationFactory.getStrategy as jest.Mock).mockReturnValue(
        authorizationStrategy,
      );
      (authorizationStrategy.canCreateShare as jest.Mock).mockResolvedValue(
        true,
      );
      (repository.findByEntityAndScope as jest.Mock).mockResolvedValue(null);
      (repository.create as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(authorizationFactory.getStrategy).toHaveBeenCalledWith(
        SharedEntityType.SKILL,
      );
      expect(authorizationStrategy.canCreateShare).toHaveBeenCalledWith(
        mockSkillId,
        mockUserId,
      );
      expect(repository.create).toHaveBeenCalledWith(expect.any(SkillShare));

      const createdShare = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdShare).toBeInstanceOf(SkillShare);
      expect(createdShare.skillId).toBe(mockSkillId);
      expect(createdShare.ownerId).toBe(mockUserId);
      expect(createdShare.scope).toBeInstanceOf(OrgShareScope);

      expect(result).toBeInstanceOf(SkillShare);
      expect((result as SkillShare).skillId).toBe(mockSkillId);
      expect(result.ownerId).toBe(mockUserId);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      const command = new CreateOrgSkillShareCommand(mockSkillId);

      (contextService.get as jest.Mock).mockReturnValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(command)).rejects.toThrow(
        'User not authenticated',
      );
    });

    it('should throw UnauthorizedException when org is not found', async () => {
      // Arrange
      const command = new CreateOrgSkillShareCommand(mockSkillId);

      (contextService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return null;
        return null;
      });

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(command)).rejects.toThrow(
        'User organization not found',
      );
    });

    it('should throw ForbiddenException when user cannot create share for the skill', async () => {
      // Arrange
      const command = new CreateOrgSkillShareCommand(mockSkillId);

      mockUserContext();

      (authorizationFactory.getStrategy as jest.Mock).mockReturnValue(
        authorizationStrategy,
      );
      (authorizationStrategy.canCreateShare as jest.Mock).mockResolvedValue(
        false,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(useCase.execute(command)).rejects.toThrow(
        'User cannot create share for this skill',
      );
    });

    it('should throw Error for unsupported command type', async () => {
      // Arrange
      const unsupportedCommand = {} as any;

      mockUserContext();

      // Act & Assert
      await expect(useCase.execute(unsupportedCommand)).rejects.toThrow(
        'Unsupported share command type',
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      const command = new CreateOrgSkillShareCommand(mockSkillId);
      const repositoryError = new Error('Database connection failed');

      mockUserContext();

      (authorizationFactory.getStrategy as jest.Mock).mockReturnValue(
        authorizationStrategy,
      );
      (authorizationStrategy.canCreateShare as jest.Mock).mockResolvedValue(
        true,
      );
      (repository.findByEntityAndScope as jest.Mock).mockResolvedValue(null);
      (repository.create as jest.Mock).mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(repositoryError);
    });

    it('should throw ShareAlreadyExistsError when share already exists for org scope', async () => {
      // Arrange
      const command = new CreateOrgSkillShareCommand(mockSkillId);
      const existingShare = new SkillShare({
        skillId: mockSkillId,
        scope: new OrgShareScope({ orgId: mockOrgId }),
        ownerId: mockUserId,
      });

      mockUserContext();

      (authorizationFactory.getStrategy as jest.Mock).mockReturnValue(
        authorizationStrategy,
      );
      (authorizationStrategy.canCreateShare as jest.Mock).mockResolvedValue(
        true,
      );
      (repository.findByEntityAndScope as jest.Mock).mockResolvedValue(
        existingShare,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'A share already exists for this entity with org scope',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create an org-scoped knowledge base share when user owns the knowledge base', async () => {
      // Arrange
      const mockKnowledgeBaseId = randomUUID();
      const command = new CreateOrgKnowledgeBaseShareCommand(
        mockKnowledgeBaseId,
      );

      mockUserContext();

      (authorizationFactory.getStrategy as jest.Mock).mockReturnValue(
        authorizationStrategy,
      );
      (authorizationStrategy.canCreateShare as jest.Mock).mockResolvedValue(
        true,
      );
      (repository.findByEntityAndScope as jest.Mock).mockResolvedValue(null);
      (repository.create as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(authorizationFactory.getStrategy).toHaveBeenCalledWith(
        SharedEntityType.KNOWLEDGE_BASE,
      );
      expect(authorizationStrategy.canCreateShare).toHaveBeenCalledWith(
        mockKnowledgeBaseId,
        mockUserId,
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.any(KnowledgeBaseShare),
      );

      const createdShare = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdShare).toBeInstanceOf(KnowledgeBaseShare);
      expect(createdShare.knowledgeBaseId).toBe(mockKnowledgeBaseId);
      expect(createdShare.ownerId).toBe(mockUserId);
      expect(createdShare.scope).toBeInstanceOf(OrgShareScope);

      expect(result).toBeInstanceOf(KnowledgeBaseShare);
      expect((result as KnowledgeBaseShare).knowledgeBaseId).toBe(
        mockKnowledgeBaseId,
      );
    });

    it('should create a team-scoped knowledge base share when user is a team member', async () => {
      // Arrange
      const mockKnowledgeBaseId = randomUUID();
      const mockTeamId = randomUUID();
      const command = new CreateTeamKnowledgeBaseShareCommand(
        mockKnowledgeBaseId,
        mockTeamId,
      );

      mockUserContext();

      (authorizationFactory.getStrategy as jest.Mock).mockReturnValue(
        authorizationStrategy,
      );
      (authorizationStrategy.canCreateShare as jest.Mock).mockResolvedValue(
        true,
      );
      (checkUserTeamMembershipUseCase.execute as jest.Mock).mockResolvedValue(
        true,
      );
      (repository.findByEntityAndScope as jest.Mock).mockResolvedValue(null);
      (repository.create as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(authorizationFactory.getStrategy).toHaveBeenCalledWith(
        SharedEntityType.KNOWLEDGE_BASE,
      );
      expect(authorizationStrategy.canCreateShare).toHaveBeenCalledWith(
        mockKnowledgeBaseId,
        mockUserId,
      );
      expect(checkUserTeamMembershipUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockUserId, teamId: mockTeamId }),
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.any(KnowledgeBaseShare),
      );

      const createdShare = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdShare).toBeInstanceOf(KnowledgeBaseShare);
      expect(createdShare.knowledgeBaseId).toBe(mockKnowledgeBaseId);
      expect(createdShare.ownerId).toBe(mockUserId);
      expect(createdShare.scope).toBeInstanceOf(TeamShareScope);
      expect((createdShare.scope as TeamShareScope).teamId).toBe(mockTeamId);

      expect(result).toBeInstanceOf(KnowledgeBaseShare);
      expect((result as KnowledgeBaseShare).knowledgeBaseId).toBe(
        mockKnowledgeBaseId,
      );
    });
  });
});
