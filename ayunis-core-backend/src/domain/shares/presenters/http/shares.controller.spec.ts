import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SharesController } from './shares.controller';
import { CreateShareUseCase } from '../../application/use-cases/create-share/create-share.use-case';
import { DeleteShareUseCase } from '../../application/use-cases/delete-share/delete-share.use-case';
import { GetSharesUseCase } from '../../application/use-cases/get-shares/get-shares.use-case';
import { ShareDtoMapper } from './mappers/share-dto.mapper';
import { CreateAgentShareDto } from './dto/create-share.dto';
import type { ShareResponseDto } from './dto/share-response.dto';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from '../../domain/value-objects/share-scope-type.enum';
import { AgentShare } from '../../domain/share.entity';
import { OrgShareScope } from '../../domain/share-scope.entity';
import { CreateOrgAgentShareCommand } from '../../application/use-cases/create-share/create-share.command';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';

describe('SharesController', () => {
  let controller: SharesController;
  let createShareUseCase: CreateShareUseCase;
  let deleteShareUseCase: DeleteShareUseCase;
  let getSharesUseCase: GetSharesUseCase;
  let shareDtoMapper: ShareDtoMapper;

  const mockAgentId = randomUUID();
  const mockUserId = randomUUID();
  const mockShareId = randomUUID();
  const mockOrgId = randomUUID();

  beforeEach(async () => {
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

  describe('createShare', () => {
    it('should create an agent share successfully', async () => {
      // Arrange
      const createShareDto = new CreateAgentShareDto();
      createShareDto.agentId = mockAgentId;
      createShareDto.entityType = SharedEntityType.AGENT;

      const mockShare = new AgentShare({
        agentId: mockAgentId,
        scope: new OrgShareScope({ orgId: mockOrgId }),
        ownerId: mockUserId,
      });

      const expectedResponseDto: ShareResponseDto = {
        id: mockShareId,
        entityType: SharedEntityType.AGENT,
        entityId: mockAgentId,
        scopeType: ShareScopeType.ORG,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (createShareUseCase.execute as jest.Mock).mockResolvedValue(mockShare);
      (shareDtoMapper.toDto as jest.Mock).mockReturnValue(expectedResponseDto);

      // Act
      const result = await controller.createShare(createShareDto);

      // Assert
      expect(createShareUseCase.execute).toHaveBeenCalledWith(
        expect.any(CreateOrgAgentShareCommand),
      );
      const command = (createShareUseCase.execute as jest.Mock).mock
        .calls[0][0];
      expect(command.agentId).toBe(mockAgentId);
      expect(shareDtoMapper.toDto).toHaveBeenCalledWith(mockShare);
      expect(result).toEqual(expectedResponseDto);
    });

    it('should handle UnauthorizedException from use case', async () => {
      // Arrange
      const createShareDto = new CreateAgentShareDto();
      createShareDto.agentId = mockAgentId;
      createShareDto.entityType = SharedEntityType.AGENT;

      const error = new UnauthorizedException('User not authenticated');
      (createShareUseCase.execute as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createShare(createShareDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.createShare(createShareDto)).rejects.toThrow(
        'User not authenticated',
      );
    });

    it('should handle ForbiddenException from use case', async () => {
      // Arrange
      const createShareDto = new CreateAgentShareDto();
      createShareDto.agentId = mockAgentId;
      createShareDto.entityType = SharedEntityType.AGENT;

      const error = new ForbiddenException(
        'User cannot create share for this agent',
      );
      (createShareUseCase.execute as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createShare(createShareDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(controller.createShare(createShareDto)).rejects.toThrow(
        'User cannot create share for this agent',
      );
    });

    it('should log the create share request', async () => {
      // Arrange
      const createShareDto = new CreateAgentShareDto();
      createShareDto.agentId = mockAgentId;
      createShareDto.entityType = SharedEntityType.AGENT;

      const mockShare = new AgentShare({
        agentId: mockAgentId,
        scope: new OrgShareScope({ orgId: mockOrgId }),
        ownerId: mockUserId,
      });

      const expectedResponseDto: ShareResponseDto = {
        id: mockShareId,
        entityType: SharedEntityType.AGENT,
        entityId: mockAgentId,
        scopeType: ShareScopeType.ORG,
        ownerId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (createShareUseCase.execute as jest.Mock).mockResolvedValue(mockShare);
      (shareDtoMapper.toDto as jest.Mock).mockReturnValue(expectedResponseDto);

      // Spy on logger
      const logSpy = jest.spyOn(controller['logger'], 'log');

      // Act
      await controller.createShare(createShareDto);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('createShare', {
        entityType: SharedEntityType.AGENT,
        agentId: mockAgentId,
      });
    });
  });

  describe('getShares', () => {
    it('should retrieve shares for an entity', async () => {
      // Arrange
      const entityId = mockAgentId;
      const entityType = SharedEntityType.AGENT;

      const mockShares = [
        new AgentShare({
          agentId: mockAgentId,
          scope: new OrgShareScope({ orgId: mockOrgId }),
          ownerId: mockUserId,
        }),
      ];

      const expectedResponseDtos: ShareResponseDto[] = [
        {
          id: mockShareId,
          entityType: SharedEntityType.AGENT,
          entityId: mockAgentId,
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

      // Act
      const result = await controller.getShares(entityId, entityType);

      // Assert
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
      // Arrange
      const shareId = mockShareId;
      (deleteShareUseCase.execute as jest.Mock).mockResolvedValue(undefined);

      // Act
      await controller.deleteShare(shareId);

      // Assert
      expect(deleteShareUseCase.execute).toHaveBeenCalledWith(shareId);
    });
  });
});
