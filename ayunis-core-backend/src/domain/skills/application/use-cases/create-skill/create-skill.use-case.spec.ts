import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { CreateSkillUseCase } from './create-skill.use-case';
import { CreateSkillCommand } from './create-skill.command';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';

import { ContextService } from 'src/common/context/services/context.service';
import { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import { SkillNameLookupService } from 'src/domain/skills/application/services/skill-name-lookup.service';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import {
  OwnershipViewer,
  type OwnershipViewerParams,
} from 'src/domain/ownership/application/models/ownership-viewer';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import type { UUID } from 'crypto';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
} from 'src/domain/skills/application/skills.errors';

describe('CreateSkillUseCase', () => {
  let useCase: CreateSkillUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let collectiveRepository: jest.Mocked<CollectiveSkillRepository>;
  let getViewer: jest.Mocked<GetOwnershipViewerUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  const mockOrgId = '223e4567-e89b-12d3-a456-426614174999' as UUID;

  beforeAll(async () => {
    const mockSkillRepository = {
      create: jest.fn(),
      findByNameAndOwner: jest.fn(),
      findByNameAndWorkspace: jest.fn(),
      activateSkill: jest.fn(),
      activateWorkspaceSkill: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn(
        getFromUserContext({ userId: mockUserId, orgId: mockOrgId }),
      ),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSkillUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: SkillAuthorizationService,
          useValue: { requireManage: jest.fn() },
        },
        SkillNameLookupService,
        {
          provide: CollectiveSkillRepository,
          useValue: {
            findByNameAndTeam: jest.fn(),
            findByNameAndOrg: jest.fn(),
            setActive: jest.fn(),
          },
        },
        {
          provide: GetOwnershipViewerUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<CreateSkillUseCase>(CreateSkillUseCase);
    skillRepository = module.get(SkillRepository);
    collectiveRepository = module.get(CollectiveSkillRepository);
    getViewer = module.get(GetOwnershipViewerUseCase);
  });

  function viewerWith(params: Partial<OwnershipViewerParams>) {
    getViewer.execute.mockResolvedValue(
      new OwnershipViewer({
        userId: mockUserId,
        orgId: mockOrgId,
        isAdmin: false,
        permissions: [],
        memberTeamIds: [],
        adminTeamIds: [],
        teamAdminPermissions: [],
        ...params,
      }),
    );
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a skill successfully', async () => {
    const command = new CreateSkillCommand({
      owner: { type: 'personal' },
      name: 'Legal Research',
      shortDescription: 'Research legal topics and find case law.',
      instructions:
        'You are a legal research assistant. Search through legal databases...',
    });

    const expectedSkill = new PersonalSkill({
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      userId: mockUserId,
    });

    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.create.mockResolvedValue(expectedSkill);

    const result = await useCase.execute(command);

    expect(skillRepository.findByNameAndOwner).toHaveBeenCalledWith(
      'Legal Research',
      mockUserId,
    );
    expect(skillRepository.create).toHaveBeenCalledWith(
      expect.any(PersonalSkill),
    );
    expect(result.name).toBe('Legal Research');
    expect(result.shortDescription).toBe(
      'Research legal topics and find case law.',
    );
  });

  it('should translate invalid domain names to a skill application error', async () => {
    const command = new CreateSkillCommand({
      owner: { type: 'personal' },
      name: ' Invalid name',
      shortDescription: 'Invalid skill.',
      instructions: 'Invalid instructions.',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      SkillInvalidInputError,
    );
    expect(skillRepository.findByNameAndOwner).not.toHaveBeenCalled();
    expect(skillRepository.create).not.toHaveBeenCalled();
  });

  it('should reject creation when skill name already exists for the user', async () => {
    const command = new CreateSkillCommand({
      owner: { type: 'personal' },
      name: 'Legal Research',
      shortDescription: 'Duplicate name skill.',
      instructions: 'Some instructions.',
    });

    const existingSkill = new PersonalSkill({
      name: 'Legal Research',
      shortDescription: 'Existing skill.',
      instructions: 'Existing instructions.',
      userId: mockUserId,
    });

    skillRepository.findByNameAndOwner.mockResolvedValue(existingSkill);

    await expect(useCase.execute(command)).rejects.toThrow(
      DuplicateSkillNameError,
    );
    expect(skillRepository.create).not.toHaveBeenCalled();
  });

  it('creates an independently owned workspace skill', async () => {
    const workspaceId = '223e4567-e89b-12d3-a456-426614174001' as UUID;
    const mcpIntegrationId = '423e4567-e89b-12d3-a456-426614174003' as UUID;
    const command = new CreateSkillCommand({
      owner: { type: 'workspace', workspaceId },
      name: 'Workspace legal research',
      shortDescription: 'Researches workspace legal topics.',
      instructions: 'Use the workspace legal sources.',
      mcpIntegrationIds: [mcpIntegrationId],
      isActive: false,
    });
    skillRepository.findByNameAndWorkspace.mockResolvedValue(null);
    skillRepository.create.mockImplementation(async (skill) => skill);

    const result = await useCase.execute(command);

    expect(result).toMatchObject({
      workspaceId,
      mcpIntegrationIds: [mcpIntegrationId],
      sourceIds: [],
      knowledgeBaseIds: [],
    });
    expect(skillRepository.activateSkill).not.toHaveBeenCalled();
    expect(skillRepository.activateWorkspaceSkill).not.toHaveBeenCalled();
  });

  it('should activate the skill when isActive is true in command', async () => {
    const command = new CreateSkillCommand({
      owner: { type: 'personal' },
      name: 'Active Skill',
      shortDescription: 'An active skill.',
      instructions: 'You are an active assistant.',
      isActive: true,
    });

    const createdSkill = new PersonalSkill({
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      userId: mockUserId,
    });

    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.create.mockResolvedValue(createdSkill);
    skillRepository.activateSkill.mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(skillRepository.activateSkill).toHaveBeenCalledWith(
      createdSkill.id,
      mockUserId,
    );
  });

  it('activates the skill by default when isActive is not set', async () => {
    const command = new CreateSkillCommand({
      owner: { type: 'personal' },
      name: 'Data Analysis',
      shortDescription: 'Analyze data.',
      instructions: 'You are a data analysis expert.',
    });

    const createdSkill = new PersonalSkill({
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      userId: mockUserId,
    });

    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.create.mockResolvedValue(createdSkill);

    await useCase.execute(command);

    expect(skillRepository.activateSkill).toHaveBeenCalledWith(
      expect.any(String),
      mockUserId,
    );
  });

  describe('team and organisation owners', () => {
    const teamId = '323e4567-e89b-12d3-a456-426614174111' as UUID;
    const draft = {
      name: 'Bauantrag vorprüfen',
      shortDescription: 'Prüft Bauanträge',
      instructions: 'Prüfe die Unterlagen.',
    };

    beforeEach(() => {
      skillRepository.create.mockImplementation((skill) =>
        Promise.resolve(skill),
      );
    });

    it('lets a team admin with the team right create a team skill', async () => {
      viewerWith({
        memberTeamIds: [teamId],
        adminTeamIds: [teamId],
        teamAdminPermissions: [TeamAdminPermission.TEAM_MANAGE_SKILLS],
      });

      const created = await useCase.execute(
        new CreateSkillCommand({ ...draft, owner: { type: 'team', teamId } }),
      );

      expect(created).toBeInstanceOf(TeamSkill);
      expect(created).toMatchObject({ teamId, orgId: mockOrgId });
      expect(skillRepository.activateSkill).not.toHaveBeenCalled();
    });

    it('rejects a team the caller does not administer, even as admin', async () => {
      viewerWith({ isAdmin: true, permissions: Object.values(Permission) });

      await expect(
        useCase.execute(
          new CreateSkillCommand({ ...draft, owner: { type: 'team', teamId } }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedAccessError);
      expect(skillRepository.create).not.toHaveBeenCalled();
    });

    it('creates an organisation skill with the organisation right', async () => {
      viewerWith({ permissions: [Permission.MANAGE_ORG_SKILLS] });

      const created = await useCase.execute(
        new CreateSkillCommand({ ...draft, owner: { type: 'org' } }),
      );

      expect(created).toBeInstanceOf(OrgSkill);
    });

    it('rejects an organisation skill without the organisation right', async () => {
      viewerWith({ permissions: [Permission.MANAGE_OWN_SKILLS] });

      await expect(
        useCase.execute(
          new CreateSkillCommand({ ...draft, owner: { type: 'org' } }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    });

    it('rejects a duplicate name within the same organisation', async () => {
      viewerWith({ permissions: [Permission.MANAGE_ORG_SKILLS] });
      collectiveRepository.findByNameAndOrg.mockResolvedValueOnce(
        new OrgSkill({ ...draft, orgId: mockOrgId }),
      );

      await expect(
        useCase.execute(
          new CreateSkillCommand({ ...draft, owner: { type: 'org' } }),
        ),
      ).rejects.toBeInstanceOf(DuplicateSkillNameError);
    });

    it('stores an inactive state for the creator when requested', async () => {
      viewerWith({ permissions: [Permission.MANAGE_ORG_SKILLS] });

      const created = await useCase.execute(
        new CreateSkillCommand({
          ...draft,
          owner: { type: 'org' },
          isActive: false,
        }),
      );

      expect(collectiveRepository.setActive).toHaveBeenCalledWith(
        created.id,
        mockUserId,
        false,
      );
    });
  });
});
