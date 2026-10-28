import type { UUID } from 'crypto';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { SkillShareRecord } from 'src/domain/shares/infrastructure/postgres/schema/share.record';
import { OrgShareScopeRecord } from 'src/domain/shares/infrastructure/postgres/schema/share-scope.record';
import { SharedSkillKnowledgeBaseSeeder } from './shared-skill-knowledge-base-seeder';

const orgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
const ownerId = '223e4567-e89b-12d3-a456-426614174001' as UUID;
const skillId = '323e4567-e89b-12d3-a456-426614174002' as UUID;
const knowledgeBaseId = '423e4567-e89b-12d3-a456-426614174003' as UUID;
const scopeId = '523e4567-e89b-12d3-a456-426614174004' as UUID;
const shareId = '623e4567-e89b-12d3-a456-426614174005' as UUID;

type SeededSkill = {
  id: UUID;
  name: string;
  knowledgeBases: Array<{ id: UUID }>;
};

type ExistingShare = {
  id: UUID;
  scope: { id: UUID; orgId: UUID };
};

interface HarnessOptions {
  assignedKnowledgeBaseIds?: UUID[];
  existingShare?: ExistingShare | null;
  skill?: SeededSkill | null;
  knowledgeBase?: { id: UUID; name: string } | null;
}

function createHarness(options: HarnessOptions = {}) {
  const relationAdd = jest.fn().mockResolvedValue(undefined);
  const scope = { id: scopeId, orgId };
  const scopeRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((value) => value),
    save: jest.fn().mockResolvedValue(scope),
  };
  const skill =
    options.skill === undefined
      ? {
          id: skillId,
          name: 'Shared civic knowledge',
          knowledgeBases: (options.assignedKnowledgeBaseIds ?? []).map(
            (id) => ({
              id,
            }),
          ),
        }
      : options.skill;
  const skillRepository = {
    findOne: jest.fn().mockResolvedValue(skill),
    createQueryBuilder: jest.fn().mockReturnValue({
      relation: jest.fn().mockReturnValue({
        of: jest.fn().mockReturnValue({ add: relationAdd }),
      }),
    }),
  };
  const knowledgeBaseRepository = {
    findOne: jest
      .fn()
      .mockResolvedValue(
        options.knowledgeBase === undefined
          ? { id: knowledgeBaseId, name: 'Shared civic knowledge base' }
          : options.knowledgeBase,
      ),
  };
  const shareRepository = {
    findOne: jest.fn().mockResolvedValue(options.existingShare ?? null),
    create: jest.fn((value) => value),
    save: jest.fn().mockImplementation(async (value) => value),
  };
  const repo = jest.fn((target: unknown) => {
    if (target === OrgShareScopeRecord) return scopeRepository;
    if (target === SkillRecord) return skillRepository;
    if (target === KnowledgeBaseRecord) return knowledgeBaseRepository;
    if (target === SkillShareRecord) return shareRepository;
    throw new Error('Unexpected repository');
  });
  const seeder = new SharedSkillKnowledgeBaseSeeder();
  (seeder as unknown as { repo: typeof repo }).repo = repo;

  return {
    seeder,
    relationAdd,
    shareRepository,
    run: () =>
      seeder.seedForOrg(
        {
          getOrg: jest.fn().mockReturnValue({ id: orgId }),
          getAdmin: jest.fn().mockReturnValue({ id: ownerId }),
        } as never,
        {
          key: 'demo',
          sharedSkillKnowledgeBases: [
            {
              skillName: 'Shared civic knowledge',
              knowledgeBaseName: 'Shared civic knowledge base',
            },
          ],
        } as never,
      ),
  };
}

describe('SharedSkillKnowledgeBaseSeeder', () => {
  it('links the configured knowledge base and creates an org-scoped skill share', async () => {
    const harness = createHarness();

    await harness.run();

    expect(harness.relationAdd).toHaveBeenCalledWith(knowledgeBaseId);
    expect(harness.shareRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId,
        ownerId,
        scope: expect.objectContaining({ id: scopeId, orgId }),
      }),
    );
  });

  it('does not create duplicate assignment or share records when rerun', async () => {
    const harness = createHarness({
      assignedKnowledgeBaseIds: [knowledgeBaseId],
      existingShare: { id: shareId, scope: { id: scopeId, orgId } },
    });

    await harness.run();

    expect(harness.relationAdd).not.toHaveBeenCalled();
    expect(harness.shareRepository.save).not.toHaveBeenCalled();
  });

  it('repairs an existing share that points to another organization scope', async () => {
    const harness = createHarness({
      assignedKnowledgeBaseIds: [knowledgeBaseId],
      existingShare: {
        id: shareId,
        scope: {
          id: '723e4567-e89b-12d3-a456-426614174006',
          orgId,
        },
      },
    });

    await harness.run();

    expect(harness.shareRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: shareId,
        scope: expect.objectContaining({ id: scopeId, orgId }),
      }),
    );
  });

  it('does nothing when the organization has no shared skill fixtures', async () => {
    const repo = jest.fn();
    const seeder = new SharedSkillKnowledgeBaseSeeder();
    (seeder as unknown as { repo: typeof repo }).repo = repo;

    await seeder.seedForOrg({} as never, { key: 'demo' } as never);

    expect(repo).not.toHaveBeenCalled();
  });

  it('fails when the configured skill is missing', async () => {
    const harness = createHarness({ skill: null });

    await expect(harness.run()).rejects.toThrow(
      'Seed skill not found: Shared civic knowledge',
    );
  });

  it('fails when the configured knowledge base is missing', async () => {
    const harness = createHarness({ knowledgeBase: null });

    await expect(harness.run()).rejects.toThrow(
      'Seed knowledge base not found: Shared civic knowledge base',
    );
  });
});
