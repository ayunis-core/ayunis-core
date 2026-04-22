import type { UUID } from 'crypto';
import { Skill } from '../../../domain/skill.entity';
import { SkillDtoMapper } from './skill.mapper';
import type { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import type { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';

describe('SkillDtoMapper', () => {
  const ownerUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const sharedUserId = '123e4567-e89b-12d3-a456-426614174001' as UUID;

  const makeSkill = (params?: {
    id?: UUID;
    userId?: UUID;
    name?: string;
  }): Skill =>
    new Skill({
      id: params?.id ?? ('223e4567-e89b-12d3-a456-426614174000' as UUID),
      name: params?.name ?? 'Legal Research',
      shortDescription: 'Research legal topics',
      instructions: 'You are a legal research assistant',
      userId: params?.userId ?? ownerUserId,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
  let findUsersByIdsUseCase: jest.Mocked<FindUsersByIdsUseCase>;
  let mapper: SkillDtoMapper;

  beforeEach(() => {
    findUserByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByIdUseCase>;

    findUsersByIdsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUsersByIdsUseCase>;

    mapper = new SkillDtoMapper(findUserByIdUseCase, findUsersByIdsUseCase);
  });

  describe('toDto', () => {
    it('does not resolve creator name for non-shared skills', async () => {
      const skill = makeSkill();

      const dto = await mapper.toDto(skill, {
        isActive: true,
        isShared: false,
        isPinned: false,
      });

      expect(findUserByIdUseCase.execute).not.toHaveBeenCalled();
      expect(dto.creatorName).toBeNull();
    });

    it('resolves creator name for shared skills', async () => {
      const skill = makeSkill({ userId: sharedUserId });
      findUserByIdUseCase.execute.mockResolvedValue({
        name: 'Jane Doe',
      } as never);

      const dto = await mapper.toDto(skill, {
        isActive: true,
        isShared: true,
        isPinned: false,
      });

      expect(findUserByIdUseCase.execute).toHaveBeenCalledTimes(1);
      expect(dto.creatorName).toBe('Jane Doe');
    });
  });

  describe('toDtoArray', () => {
    it('resolves creator names only for shared skills', async () => {
      const ownedSkill = makeSkill({
        id: '223e4567-e89b-12d3-a456-426614174002' as UUID,
        userId: ownerUserId,
        name: 'Owned skill',
      });
      const sharedSkill = makeSkill({
        id: '223e4567-e89b-12d3-a456-426614174003' as UUID,
        userId: sharedUserId,
        name: 'Shared skill',
      });
      findUsersByIdsUseCase.execute.mockResolvedValue([
        { id: sharedUserId, name: 'Shared User' },
      ] as never);

      const dtos = await mapper.toDtoArray(
        [ownedSkill, sharedSkill],
        new Set([ownedSkill.id, sharedSkill.id]),
        new Set([sharedSkill.id]),
        new Set(),
      );

      expect(findUsersByIdsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: [sharedUserId],
        }),
      );
      expect(dtos[0].creatorName).toBeNull();
      expect(dtos[1].creatorName).toBe('Shared User');
    });
  });
});
