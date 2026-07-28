import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

import { AddFileSourceToSkillUseCase } from './add-file-source-to-skill.use-case';
import { AddFileSourceToSkillCommand } from './add-file-source-to-skill.command';
import { AddSourceToSkillUseCase } from '../add-source-to-skill/add-source-to-skill.use-case';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { SkillRepository } from '../../ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { SkillsConstants } from 'src/domain/skills/domain/skills.constants';
import {
  SkillNotFoundError,
  SkillSourceLimitExceededError,
} from '../../skills.errors';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { Source } from 'src/domain/sources/domain/source.entity';
import { EmptyFileDataError } from 'src/domain/sources/application/sources.errors';

class ConcreteSource extends Source {
  constructor(params: { id?: UUID; name: string }) {
    super({
      id: params.id,
      type: SourceType.TEXT,
      name: params.name,
    });
  }
}

describe('AddFileSourceToSkillUseCase', () => {
  let useCase: AddFileSourceToSkillUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let startDocumentProcessingUseCase: jest.Mocked<StartDocumentProcessingUseCase>;
  let addSourceToSkillUseCase: jest.Mocked<AddSourceToSkillUseCase>;

  const mockUserId = randomUUID();
  const mockSkillId = randomUUID();

  const buildSkill = (sourceCount: number): Skill =>
    new Skill({
      id: mockSkillId,
      userId: mockUserId,
      name: 'Research',
      shortDescription: 'Research helper',
      instructions: 'Answer questions',
      sourceIds: Array.from({ length: sourceCount }, () => randomUUID()),
    });

  const buildCommand = (): AddFileSourceToSkillCommand =>
    new AddFileSourceToSkillCommand({
      skillId: mockSkillId,
      fileData: Buffer.from('file contents'),
      fileName: 'report.pdf',
      fileType: 'application/pdf',
    });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddFileSourceToSkillUseCase,
        { provide: SkillRepository, useValue: { findOne: jest.fn() } },
        {
          provide: StartDocumentProcessingUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: AddSourceToSkillUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'userId' ? mockUserId : undefined,
            ),
          },
        },
      ],
    }).compile();

    useCase = module.get<AddFileSourceToSkillUseCase>(
      AddFileSourceToSkillUseCase,
    );
    skillRepository = module.get(SkillRepository);
    startDocumentProcessingUseCase = module.get(StartDocumentProcessingUseCase);
    addSourceToSkillUseCase = module.get(AddSourceToSkillUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start processing and assign the source when the skill is below the cap', async () => {
    const skill = buildSkill(SkillsConstants.MAX_SOURCES - 1);
    const source = new ConcreteSource({ name: 'report.pdf' });
    skillRepository.findOne.mockResolvedValue(skill);
    startDocumentProcessingUseCase.execute.mockResolvedValue(
      source as unknown as Awaited<
        ReturnType<StartDocumentProcessingUseCase['execute']>
      >,
    );
    const updatedSkill = buildSkill(SkillsConstants.MAX_SOURCES);
    addSourceToSkillUseCase.execute.mockResolvedValue(updatedSkill);

    const result = await useCase.execute(buildCommand());

    expect(result).toBe(updatedSkill);
    expect(startDocumentProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'report.pdf',
        fileType: 'application/pdf',
      }),
    );
    expect(addSourceToSkillUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ skillId: mockSkillId, sourceId: source.id }),
    );
  });

  it('should reject before uploading or enqueueing when the skill is at the cap', async () => {
    skillRepository.findOne.mockResolvedValue(
      buildSkill(SkillsConstants.MAX_SOURCES),
    );

    await expect(useCase.execute(buildCommand())).rejects.toThrow(
      SkillSourceLimitExceededError,
    );

    expect(startDocumentProcessingUseCase.execute).not.toHaveBeenCalled();
    expect(addSourceToSkillUseCase.execute).not.toHaveBeenCalled();
  });

  it('should reject before uploading when the skill does not belong to the user', async () => {
    skillRepository.findOne.mockResolvedValue(null);

    await expect(useCase.execute(buildCommand())).rejects.toThrow(
      SkillNotFoundError,
    );

    expect(startDocumentProcessingUseCase.execute).not.toHaveBeenCalled();
  });

  it('should propagate application errors from document processing unchanged', async () => {
    skillRepository.findOne.mockResolvedValue(buildSkill(0));
    startDocumentProcessingUseCase.execute.mockRejectedValue(
      new EmptyFileDataError('report.pdf'),
    );

    await expect(useCase.execute(buildCommand())).rejects.toThrow(
      EmptyFileDataError,
    );

    expect(addSourceToSkillUseCase.execute).not.toHaveBeenCalled();
  });
});
