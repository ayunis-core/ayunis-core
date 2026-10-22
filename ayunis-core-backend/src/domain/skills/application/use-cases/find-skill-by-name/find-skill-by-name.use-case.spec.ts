import { randomUUID, type UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { anOwnershipViewer } from 'src/domain/ownership/application/testing/ownership.fixtures';
import type { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { FindSkillByNameQuery } from './find-skill-by-name.query';
import { FindSkillByNameUseCase } from './find-skill-by-name.use-case';
import { skillSlugName } from 'src/domain/skills/domain/skill-slug-prefix';

const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;
const orgId = randomUUID();
const skillParams = { shortDescription: 'desc', instructions: 'instructions' };

function setup() {
  const skillRepository = {
    findByNameAndOwner: jest.fn().mockResolvedValue(null),
    findByIds: jest.fn().mockResolvedValue([]),
  };
  const links = { findByWorkspace: jest.fn().mockResolvedValue([]) };
  const collectiveRepository = { findUsable: jest.fn().mockResolvedValue([]) };
  const contextService = { get: jest.fn().mockReturnValue(userId) };
  const useCase = new FindSkillByNameUseCase(
    skillRepository as unknown as SkillRepository,
    contextService as unknown as ContextService,
    collectiveRepository as unknown as CollectiveSkillRepository,
    {
      execute: jest
        .fn()
        .mockResolvedValue(anOwnershipViewer({ userId, orgId })),
    } as unknown as GetOwnershipViewerUseCase,
    links as unknown as WorkspaceSkillLinkRepository,
  );
  return {
    useCase,
    skillRepository,
    collectiveRepository,
    contextService,
    links,
  };
}

describe(FindSkillByNameUseCase.name, () => {
  it('returns the owned skill with that name', async () => {
    const { useCase, skillRepository } = setup();
    const skill = new PersonalSkill({ ...skillParams, name: 'Notiz', userId });
    skillRepository.findByNameAndOwner.mockResolvedValue(skill);

    await expect(
      useCase.execute(new FindSkillByNameQuery('Notiz')),
    ).resolves.toBe(skill);
    expect(skillRepository.findByNameAndOwner).toHaveBeenCalledWith(
      'Notiz',
      userId,
    );
  });

  it('throws when the caller owns no skill with that name', async () => {
    const { useCase, skillRepository } = setup();
    skillRepository.findByNameAndOwner.mockResolvedValue(null);

    await expect(
      useCase.execute(new FindSkillByNameQuery('Unbekannt')),
    ).rejects.toThrow(SkillNotFoundError);
  });

  it('finds a usable team or organisation skill by its scope', async () => {
    const { useCase, collectiveRepository } = setup();
    const team = new TeamSkill({
      ...skillParams,
      name: 'Bauantrag',
      teamId: randomUUID(),
      orgId,
    });
    const org = new OrgSkill({ ...skillParams, name: 'Bauantrag', orgId });
    collectiveRepository.findUsable.mockResolvedValue([team, org]);

    await expect(
      useCase.execute(new FindSkillByNameQuery('Bauantrag', 'org')),
    ).resolves.toBe(org);
    await expect(
      useCase.execute(new FindSkillByNameQuery(skillSlugName(team), 'team')),
    ).resolves.toBe(team);
  });

  it('rejects unauthenticated callers', async () => {
    const { useCase, contextService } = setup();
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new FindSkillByNameQuery('Notiz')),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  describe("skills linked into the thread's workspace", () => {
    const workspaceId = randomUUID();
    const lena = 'b1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;
    const jonas = 'c1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;
    const ofLena = new PersonalSkill({
      ...skillParams,
      name: 'Zusammenfassen',
      userId: lena,
    });
    const ofJonas = new PersonalSkill({
      ...skillParams,
      name: 'Zusammenfassen',
      userId: jonas,
    });

    function linked(...skills: PersonalSkill[]) {
      const context = setup();
      context.links.findByWorkspace.mockResolvedValue(
        skills.map((skill) => ({ workspaceId, skillId: skill.id })),
      );
      context.skillRepository.findByIds.mockResolvedValue(skills);
      return context;
    }

    it("tells two people's linked skills with the same name apart", async () => {
      const { useCase } = linked(ofLena, ofJonas);

      await expect(
        useCase.execute(
          new FindSkillByNameQuery(
            skillSlugName(ofJonas, userId),
            'personal',
            workspaceId,
          ),
        ),
      ).resolves.toBe(ofJonas);
      await expect(
        useCase.execute(
          new FindSkillByNameQuery(
            skillSlugName(ofLena, userId),
            'personal',
            workspaceId,
          ),
        ),
      ).resolves.toBe(ofLena);
    });

    it('finds linked skills only inside a workspace thread', async () => {
      const { useCase, links } = linked(ofLena);

      await expect(
        useCase.execute(
          new FindSkillByNameQuery(skillSlugName(ofLena, userId)),
        ),
      ).rejects.toBeInstanceOf(SkillNotFoundError);
      expect(links.findByWorkspace).not.toHaveBeenCalled();
    });

    it("prefers the caller's own skill with the plain name", async () => {
      const { useCase, skillRepository } = linked(ofLena);
      const own = new PersonalSkill({
        ...skillParams,
        name: 'Zusammenfassen',
        userId,
      });
      skillRepository.findByNameAndOwner.mockResolvedValue(own);

      await expect(
        useCase.execute(
          new FindSkillByNameQuery('Zusammenfassen', 'personal', workspaceId),
        ),
      ).resolves.toBe(own);
    });
  });
});
