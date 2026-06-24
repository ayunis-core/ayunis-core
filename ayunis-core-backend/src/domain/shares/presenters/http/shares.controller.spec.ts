import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SharesController } from './shares.controller';
import { CreateShareUseCase } from '../../application/use-cases/create-share/create-share.use-case';
import { DeleteShareUseCase } from '../../application/use-cases/delete-share/delete-share.use-case';
import { GetSharesUseCase } from '../../application/use-cases/get-shares/get-shares.use-case';
import { ShareDtoMapper } from './mappers/share-dto.mapper';
import {
  CreateSkillShareDto,
  CreateKnowledgeBaseShareDto,
} from './dto/create-share.dto';
import type { ShareResponseDto } from './dto/share-response.dto';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from '../../domain/value-objects/share-scope-type.enum';
import { SkillShare, KnowledgeBaseShare } from '../../domain/share.entity';
import { OrgShareScope } from '../../domain/share-scope.entity';
import {
  CreateOrgSkillShareCommand,
  CreateOrgKnowledgeBaseShareCommand,
} from '../../application/use-cases/create-share/create-share.command';
import { randomUUID } from 'crypto';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';

describe('SharesController', () => {
  let controller: SharesController;
  let createShareUseCase: CreateShareUseCase;
  let deleteShareUseCase: DeleteShareUseCase;
  let getSharesUseCase: GetSharesUseCase;
  let shareDtoMapper: ShareDtoMapper;

  const mockSkillId = randomUUID();
  const mockUserId = randomUUID();
  const mockShareId = randomUUID();
  const mockOrgId = randomUUID();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharesController],
      providers: [
        {
          provide: CreateShareUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: DeleteShareUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetSharesUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: ShareDtoMapper,
          useValue: {
            toDto: jest.fn(),
            toDtoArray: jest.fn(),
          },
        },
        {
          provide: GetTeamUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SharesController>(SharesController);
    createShareUseCase = module.get<CreateShareUseCase>(CreateShareUseCase);
    deleteShareUseCase = module.get<DeleteShareUseCase>(DeleteShareUseCase);
    getSharesUseCase = module.get<GetSharesUseCase>(GetSharesUseCase);
    shareDtoMapper = module.get<ShareDtoMapper>(ShareDtoMapper);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSkillShare', () => {
    it('should create a skill share successfully', async () => {
      const dto = new CreateSkillShareDto();
      dto.skillId = mockSkillId;
      dto.entityType = SharedEntityType.SKILL;

      const mockShare = new SkillShare({
        skillId: mockSkillId,
        scope: new OrgShareScope({ orgId: mockOrgId }),
        ownerId: mockUserId,
      });

      const expectedResponseDto: ShareResponseDto = {
        id: mockShareId,
        entityType: SharedEntityType.SKILL,
        entityId: mockSkillId,
        scopeType: ShareScopeType.ORG,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (createShareUseCase.execute as jest.Mock).mockResolvedValue(mockShare);
      (shareDtoMapper.toDto as jest.Mock).mockReturnValue(expectedResponseDto);

      const result = await controller.createSkillShare(dto);

      expect(createShareUseCase.execute).toHaveBeenCalledWith(
        expect.any(CreateOrgSkillShareCommand),
      );
      const command = (createShareUseCase.execute as jest.Mock).mock
        .calls[0][0];
      expect(command.skillId).toBe(mockSkillId);
      expect(shareDtoMapper.toDto).toHaveBeenCalledWith(mockShare);
      expect(result).toEqual(expectedResponseDto);
    });
  });

  describe('createKnowledgeBaseShare', () => {
    it('should create a knowledge base share successfully', async () => {
      const mockKnowledgeBaseId = randomUUID();
      const dto = new CreateKnowledgeBaseShareDto();
      dto.knowledgeBaseId = mockKnowledgeBaseId;
      dto.entityType = SharedEntityType.KNOWLEDGE_BASE;

      const mockShare = new KnowledgeBaseShare({
        knowledgeBaseId: mockKnowledgeBaseId,
        scope: new OrgShareScope({ orgId: mockOrgId }),
        ownerId: mockUserId,
      });

      const expectedResponseDto: ShareResponseDto = {
        id: mockShareId,
        entityType: SharedEntityType.KNOWLEDGE_BASE,
        entityId: mockKnowledgeBaseId,
        scopeType: ShareScopeType.ORG,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (createShareUseCase.execute as jest.Mock).mockResolvedValue(mockShare);
      (shareDtoMapper.toDto as jest.Mock).mockReturnValue(expectedResponseDto);

      const result = await controller.createKnowledgeBaseShare(dto);

      expect(createShareUseCase.execute).toHaveBeenCalledWith(
        expect.any(CreateOrgKnowledgeBaseShareCommand),
      );
      const command = (createShareUseCase.execute as jest.Mock).mock
        .calls[0][0];
      expect(command.knowledgeBaseId).toBe(mockKnowledgeBaseId);
      expect(shareDtoMapper.toDto).toHaveBeenCalledWith(mockShare);
      expect(result).toEqual(expectedResponseDto);
    });
  });

  describe('getShares', () => {
    it('should retrieve shares for an entity', async () => {
      const entityId = mockSkillId;
      const entityType = SharedEntityType.SKILL;

      const mockShares = [
        new SkillShare({
          skillId: mockSkillId,
          scope: new OrgShareScope({ orgId: mockOrgId }),
          ownerId: mockUserId,
        }),
      ];

      const expectedResponseDtos: ShareResponseDto[] = [
        {
          id: mockShareId,
          entityType: SharedEntityType.SKILL,
          entityId: mockSkillId,
          scopeType: ShareScopeType.ORG,
          ownerId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (getSharesUseCase.execute as jest.Mock).mockResolvedValue(mockShares);
      (shareDtoMapper.toDtoArray as jest.Mock).mockReturnValue(
        expectedResponseDtos,
      );

      const result = await controller.getShares(entityId, entityType);

      expect(getSharesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId,
          entityType,
        }),
      );
      expect(shareDtoMapper.toDtoArray).toHaveBeenCalledWith(
        mockShares,
        expect.any(Map),
      );
      expect(result).toEqual(expectedResponseDtos);
    });
  });

  describe('deleteShare', () => {
    it('should delete a share successfully', async () => {
      const shareId = mockShareId;
      (deleteShareUseCase.execute as jest.Mock).mockResolvedValue(undefined);

      await controller.deleteShare(shareId);

      expect(deleteShareUseCase.execute).toHaveBeenCalledWith(shareId);
    });
  });
});
