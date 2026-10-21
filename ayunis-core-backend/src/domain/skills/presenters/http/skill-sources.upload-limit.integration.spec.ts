import { AddFileSourceToSkillUseCase } from 'src/domain/skills/application/use-cases/add-file-source-to-skill/add-file-source-to-skill.use-case';
import { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';
import {
  createUploadSurfaceHarness,
  expectRejectedAtDefaultLimit,
  OVER_DEFAULT_LIMIT_BYTES,
  RAISED_LIMIT_BYTES,
  type UploadSurfaceHarness,
} from 'src/common/http/testing/upload-surface.harness';
import { SkillSourcesController } from './skill-sources.controller';

const SKILL_ID = '44444444-4444-4444-8444-444444444444';
const UPLOAD_PATH = `/skills/${SKILL_ID}/sources/file`;

// Each request streams a 26 MiB body; under a loaded full-suite run that
// takes far longer than Jest's 5 s default.
jest.setTimeout(60_000);

describe('skill file source upload limit (HTTP boundary)', () => {
  const addFileSource = { execute: jest.fn().mockResolvedValue(undefined) };
  const providers = [
    { provide: AddFileSourceToSkillUseCase, useValue: addFileSource },
    {
      provide: FindOneSkillUseCase,
      useValue: {
        execute: jest
          .fn()
          .mockResolvedValue({ skill: {}, creatorName: 'Sachbearbeitung' }),
      },
    },
  ];
  let defaultDeployment: UploadSurfaceHarness;
  let raisedDeployment: UploadSurfaceHarness;

  beforeAll(async () => {
    defaultDeployment = await createUploadSurfaceHarness({
      controller: SkillSourcesController,
      providers,
    });
    raisedDeployment = await createUploadSurfaceHarness({
      controller: SkillSourcesController,
      providers,
      maxFileSizeBytes: RAISED_LIMIT_BYTES,
    });
  });

  afterAll(async () => {
    await defaultDeployment.close();
    await raisedDeployment.close();
  });

  beforeEach(() => addFileSource.execute.mockClear());

  it('rejects a 26 MiB skill source on the default limit', async () => {
    const response = await defaultDeployment.upload(
      UPLOAD_PATH,
      OVER_DEFAULT_LIMIT_BYTES,
    );

    await expectRejectedAtDefaultLimit(response);
    expect(addFileSource.execute).not.toHaveBeenCalled();
  });

  it('accepts the same source when the deployment limit is 50 MiB', async () => {
    const response = await raisedDeployment.upload(
      UPLOAD_PATH,
      OVER_DEFAULT_LIMIT_BYTES,
    );

    expect(response.status).toBe(201);
    expect(addFileSource.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId: SKILL_ID,
        file: expect.objectContaining({ size: OVER_DEFAULT_LIMIT_BYTES }),
      }),
    );
  });
});
