import { randomUUID, type UUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ArtifactNotFoundError } from 'src/domain/artifacts/application/artifacts.errors';
import type { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { ArtifactManageAccessService } from 'src/domain/artifacts/application/services/artifact-manage-access.service';
import type { ArtifactOwner } from 'src/domain/artifacts/domain/artifact-owner';
import { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import {
  type Artifact,
  DiagramArtifact,
  DocumentArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import type { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { ConvertArtifactToNormalCommand } from './convert-artifact-to-normal.command';
import { ConvertArtifactToNormalUseCase } from './convert-artifact-to-normal.use-case';

const orgId = randomUUID();
const workspaceId = randomUUID();
const creator = randomUUID();
const member = randomUUID();
const manager = randomUUID();
const artifactId = randomUUID();

const dictionary = [
  new ArtifactPiiMask({
    artifactId,
    category: PiiCategory.PERSON_NAME,
    maskIndex: 1,
    value: 'Jonas Weber',
  }),
  new ArtifactPiiMask({
    artifactId,
    category: PiiCategory.ORGANIZATION,
    maskIndex: 1,
    value: 'Müller & Söhne "Bau" (GmbH)',
  }),
];

function versions(...contents: string[]): ArtifactVersion[] {
  return contents.map(
    (content, index) =>
      new ArtifactVersion({
        artifactId,
        versionNumber: index + 1,
        content,
        authorType: AuthorType.ASSISTANT,
      }),
  );
}

function anonymous<T extends Artifact>(
  Type: new (params: ConstructorParameters<typeof DocumentArtifact>[0]) => T,
  contents: string[],
  owner: ArtifactOwner = { type: 'personal', userId: creator },
): T {
  return new Type({
    id: artifactId,
    owner,
    creatorId: creator,
    title: 'Bescheid an {{pii:PERSON_NAME_1}}',
    isAnonymous: true,
    currentVersionNumber: contents.length,
    versions: versions(...contents),
    piiMasks: dictionary,
  });
}

/**
 * The repository finds the artifact for whoever may see it; in the
 * workspace only the manager holds manage_workspace.
 */
function setup(artifact: Artifact | null, caller: UUID) {
  const conversions: Parameters<ArtifactsRepository['convertToNormal']>[0][] =
    [];
  const repository = {
    findByIdWithVersions: jest.fn().mockResolvedValue(artifact),
    convertToNormal: jest.fn(
      (params: Parameters<ArtifactsRepository['convertToNormal']>[0]) => {
        conversions.push(params);
        return Promise.resolve();
      },
    ),
  } as unknown as ArtifactsRepository;
  const workspaceWriteAccess = {
    execute: jest.fn(() =>
      caller === manager
        ? Promise.resolve()
        : Promise.reject(new UnauthorizedAccessError()),
    ),
  } as unknown as AssertWorkspaceWriteAccessUseCase;
  const context = {
    get: jest.fn(getFromUserContext({ userId: caller, orgId })),
  } as unknown as ContextService;
  const useCase = new ConvertArtifactToNormalUseCase(
    repository,
    new ArtifactManageAccessService(workspaceWriteAccess),
    context,
  );
  const convert = () =>
    useCase.execute(new ConvertArtifactToNormalCommand({ artifactId }));
  return { convert, conversions };
}

const resolvedVersions = (
  conversions: Parameters<ArtifactsRepository['convertToNormal']>[0][],
) => conversions[0].versions.map(({ content }) => content);

describe('ConvertArtifactToNormalUseCase', () => {
  it('resolves the title and every version of a document, values HTML-escaped as the editor shows them, at the version it read', async () => {
    const artifact = anonymous(DocumentArtifact, [
      '<p>Herr {{pii:PERSON_NAME_1}}</p>',
      '<p>Herr {{pii:PERSON_NAME_1}} von {{pii:ORGANIZATION_1}}</p>',
    ]);
    const { convert, conversions } = setup(artifact, creator);

    await convert();

    expect(conversions).toHaveLength(1);
    expect(conversions[0]).toMatchObject({
      artifactId,
      expectedCurrentVersionNumber: 2,
      title: 'Bescheid an Jonas Weber',
    });
    expect(conversions[0].versions.map(({ id }) => id)).toEqual(
      artifact.versions.map(({ id }) => id),
    );
    expect(resolvedVersions(conversions)).toEqual([
      '<p>Herr Jonas Weber</p>',
      '<p>Herr Jonas Weber von Müller &amp; Söhne &quot;Bau&quot; (GmbH)</p>',
    ]);
  });

  it('resolves spreadsheet headers and string cells as they are, formulas included', async () => {
    const sheet = (columns: string[], rows: (string | number | null)[][]) =>
      JSON.stringify({ format: 'spreadsheet-v1', columns, rows });
    const artifact = anonymous(SpreadsheetArtifact, [
      sheet(
        ['Name', '{{pii:ORGANIZATION_1}}'],
        [
          ['{{pii:PERSON_NAME_1}}', 3],
          ['=LEN("{{pii:PERSON_NAME_1}}")', null],
        ],
      ),
    ]);
    const { convert, conversions } = setup(artifact, creator);

    await convert();

    expect(resolvedVersions(conversions)).toEqual([
      sheet(
        ['Name', 'Müller & Söhne "Bau" (GmbH)'],
        [
          ['Jonas Weber', 3],
          ['=LEN("Jonas Weber")', null],
        ],
      ),
    ]);
  });

  it('resolves diagram values with Mermaid entity codes, so a value cannot break a label', async () => {
    const artifact = anonymous(DiagramArtifact, [
      'flowchart TD\n  A[{{pii:PERSON_NAME_1}}] --> B[{{pii:ORGANIZATION_1}}]',
    ]);
    const { convert, conversions } = setup(artifact, creator);

    await convert();

    expect(resolvedVersions(conversions)).toEqual([
      'flowchart TD\n  A[Jonas Weber] --> B[Müller #38; Söhne #34;Bau#34; #40;GmbH#41;]',
    ]);
  });

  it('rejects a workspace member who neither created the artifact nor may manage the workspace, and leaves it anonymous', async () => {
    const artifact = anonymous(DocumentArtifact, ['<p>x</p>'], {
      type: 'workspace',
      workspaceId,
    });
    const { convert, conversions } = setup(artifact, member);

    await expect(convert()).rejects.toThrow(UnauthorizedAccessError);
    expect(conversions).toEqual([]);
  });

  it('lets a member with manage_workspace convert a colleague’s workspace artifact', async () => {
    const artifact = anonymous(DocumentArtifact, ['<p>x</p>'], {
      type: 'workspace',
      workspaceId,
    });
    const { convert, conversions } = setup(artifact, manager);

    await convert();

    expect(conversions).toHaveLength(1);
  });

  it('reports not found to callers who cannot see the artifact', async () => {
    const { convert, conversions } = setup(null, member);

    await expect(convert()).rejects.toThrow(ArtifactNotFoundError);
    expect(conversions).toEqual([]);
  });

  it('leaves a normal artifact as it is', async () => {
    const artifact = new DocumentArtifact({
      id: artifactId,
      owner: { type: 'personal', userId: creator },
      creatorId: creator,
      title: 'Vermerk',
      versions: versions('<p>{{pii:PERSON_NAME_1}}</p>'),
    });
    const { convert, conversions } = setup(artifact, creator);

    await convert();

    expect(conversions).toEqual([]);
  });
});
