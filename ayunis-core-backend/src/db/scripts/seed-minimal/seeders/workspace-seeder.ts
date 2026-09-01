import { randomUUID, type UUID } from 'crypto';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import { FavoriteRecord } from 'src/domain/favorites/infrastructure/persistence/local/schema/favorite.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { SkillActivationRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill-activation.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceContentChunkRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source-content-chunk.record';
import type { TextSourceDetailsRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/text-source-details.record';
import { FileSourceDetailsRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/text-source-details.record';
import { TextSourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { WorkspaceSourceAssignmentRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-source-assignment.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { ParentChunkRecord } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/schema/parent-chunk.record';
import { ChildChunkRecord } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/schema/child-chunk.record';
import { log } from 'src/db/scripts/utils/seed-log';
import { OrgSeeder } from './base-seeder';
import {
  buildSeedEmbedding,
  hasDifferentEmbedding,
} from './workspace-seed-embedding';
import type { SeedState } from 'src/db/scripts/seed-minimal/seed-state';
import type {
  KnowledgeBaseFixture,
  OrgFixture,
  SeedDocumentFixture,
  SkillFixture,
  WorkspaceFixture,
} from 'src/db/scripts/seed-minimal/seed-types';

interface WorkspaceResourceFixtures {
  skills: Map<string, SkillRecord>;
  knowledgeBases: Map<string, KnowledgeBaseRecord>;
  knowledgeBaseFixtures: Map<string, KnowledgeBaseFixture>;
}

/**
 * Seeds the org's workspaces ("Projekte"), owned by the org admin, plus demo
 * context for AYC-701: project instructions, assigned skills, assigned
 * knowledge bases and direct project documents. The rows are invisible until
 * FEATURE_WORKSPACES_ENABLED is on.
 *
 * Sidebar pin state and order are favorites rows, not workspace columns. The
 * app favorites a new workspace inside CreateWorkspaceUseCase; the seeder
 * inserts rows directly, so pinned fixtures get their favorite row explicitly.
 * Positions append after the admin's existing favorites (the favorites table
 * enforces user/position uniqueness) and follow the fixture order.
 */
export class WorkspaceSeeder extends OrgSeeder {
  async seedForOrg(ctx: SeedState, org: OrgFixture): Promise<void> {
    const workspaces = org.workspaces ?? [];
    const orgId = ctx.getOrg(org.key).id;
    const adminId = ctx.getAdmin(org.key).id;
    const skills = await this.seedSkills(adminId, org.skills ?? []);
    const knowledgeBaseFixtures = org.knowledgeBases ?? [];
    const knowledgeBases = await this.seedKnowledgeBases(
      orgId,
      adminId,
      knowledgeBaseFixtures,
    );

    for (const workspace of workspaces) {
      await this.seedWorkspace(orgId, adminId, workspace, {
        skills,
        knowledgeBases,
        knowledgeBaseFixtures: new Map(
          knowledgeBaseFixtures.map((fixture) => [fixture.name, fixture]),
        ),
      });
    }
  }

  private async seedSkills(
    userId: UUID,
    fixtures: readonly SkillFixture[],
  ): Promise<Map<string, SkillRecord>> {
    const records = new Map<string, SkillRecord>();
    for (const fixture of fixtures) {
      const record = await this.findOrCreate(
        this.repo(SkillRecord),
        { userId, name: fixture.name },
        () => ({ id: randomUUID(), userId, ...fixture }),
        { entity: 'Skill', name: fixture.name },
      );
      await this.refreshSkill(record, fixture);
      await this.seedSkillActivation(userId, record);
      records.set(fixture.name, record);
    }
    return records;
  }

  private async refreshSkill(
    record: SkillRecord,
    fixture: SkillFixture,
  ): Promise<void> {
    if (
      record.shortDescription === fixture.shortDescription &&
      record.instructions === fixture.instructions
    ) {
      return;
    }
    record.shortDescription = fixture.shortDescription;
    record.instructions = fixture.instructions;
    await this.repo(SkillRecord).save(record);
  }

  private async seedSkillActivation(
    userId: UUID,
    skill: SkillRecord,
  ): Promise<void> {
    await this.findOrCreate(
      this.repo(SkillActivationRecord),
      { userId, skillId: skill.id },
      () => ({ id: randomUUID(), userId, skillId: skill.id, isPinned: false }),
      { entity: 'SkillActivation', name: skill.name },
    );
  }

  private async seedKnowledgeBases(
    orgId: UUID,
    userId: UUID,
    fixtures: readonly KnowledgeBaseFixture[],
  ): Promise<Map<string, KnowledgeBaseRecord>> {
    const records = new Map<string, KnowledgeBaseRecord>();
    for (const fixture of fixtures) {
      const record = await this.seedKnowledgeBase(orgId, userId, fixture);
      records.set(fixture.name, record);
    }
    return records;
  }

  private async seedKnowledgeBase(
    orgId: UUID,
    userId: UUID,
    fixture: KnowledgeBaseFixture,
  ): Promise<KnowledgeBaseRecord> {
    const record = await this.findOrCreate(
      this.repo(KnowledgeBaseRecord),
      { orgId, userId, name: fixture.name },
      () => ({
        id: randomUUID(),
        orgId,
        userId,
        name: fixture.name,
        description: fixture.description,
      }),
      { entity: 'KnowledgeBase', name: fixture.name },
    );
    await this.refreshKnowledgeBase(record, fixture);
    for (const document of fixture.documents) {
      await this.seedDocument(document, record.id);
    }
    return record;
  }

  private async refreshKnowledgeBase(
    record: KnowledgeBaseRecord,
    fixture: KnowledgeBaseFixture,
  ): Promise<void> {
    if (record.description === fixture.description) return;
    record.description = fixture.description;
    await this.repo(KnowledgeBaseRecord).save(record);
  }

  private async seedWorkspace(
    orgId: UUID,
    userId: UUID,
    workspace: WorkspaceFixture,
    resources: WorkspaceResourceFixtures,
  ): Promise<void> {
    const record = await this.findOrCreateWorkspace(orgId, userId, workspace);
    await this.syncWorkspaceInstruction(record, workspace.instruction ?? null);
    await this.seedWorkspaceFavorites(userId, record, workspace);
    await this.seedWorkspaceSkills(record.id, workspace, resources.skills);
    await this.seedWorkspaceKnowledgeBases(
      record.id,
      workspace,
      resources.knowledgeBases,
      resources.knowledgeBaseFixtures,
    );
    await this.seedWorkspaceDocuments(record.id, workspace.documents ?? []);
  }

  private async findOrCreateWorkspace(
    orgId: UUID,
    userId: UUID,
    workspace: WorkspaceFixture,
  ): Promise<WorkspaceRecord> {
    return this.findOrCreate(
      this.repo(WorkspaceRecord),
      { orgId, userId, name: workspace.name },
      () => ({
        id: randomUUID(),
        orgId,
        userId,
        name: workspace.name,
        description: workspace.description ?? null,
        instruction: workspace.instruction ?? null,
        icon: workspace.icon,
        color: workspace.color,
      }),
      { entity: 'Workspace', name: workspace.name },
    );
  }

  private async syncWorkspaceInstruction(
    record: WorkspaceRecord,
    instruction: string | null,
  ): Promise<void> {
    if (record.instruction === instruction) {
      return;
    }
    record.instruction = instruction;
    await this.repo(WorkspaceRecord).save(record);
  }

  private async seedWorkspaceFavorites(
    userId: UUID,
    record: WorkspaceRecord,
    workspace: WorkspaceFixture,
  ): Promise<void> {
    if (!workspace.pinned) {
      return;
    }
    const favorites = this.repo(FavoriteRecord);
    const maxPosition = await favorites.maximum('position', { userId });
    await this.findOrCreate(
      favorites,
      {
        userId,
        referenceType: FavoriteReferenceType.Workspace,
        referenceId: record.id,
      },
      () => ({
        id: randomUUID(),
        userId,
        referenceType: FavoriteReferenceType.Workspace,
        referenceId: record.id,
        position: (maxPosition ?? -1) + 1,
      }),
      { entity: 'Favorite', name: workspace.name },
    );
  }

  private async seedWorkspaceSkills(
    workspaceId: UUID,
    workspace: WorkspaceFixture,
    skills: Map<string, SkillRecord>,
  ): Promise<void> {
    for (const name of workspace.skillNames ?? []) {
      const origin = this.requireFixtureRecord(skills, name, 'skill');
      await this.findOrCreate(
        this.repo(SkillRecord),
        { workspaceId, name },
        () => ({
          id: randomUUID(),
          userId: null,
          workspaceId,
          name: origin.name,
          shortDescription: origin.shortDescription,
          instructions: origin.instructions,
          marketplaceIdentifier: null,
          originSkillId: origin.id,
          importedOriginVersion: origin.version,
        }),
        { entity: 'WorkspaceSkill', name },
      );
    }
  }

  private async seedWorkspaceKnowledgeBases(
    workspaceId: UUID,
    workspace: WorkspaceFixture,
    knowledgeBases: Map<string, KnowledgeBaseRecord>,
    fixtures: Map<string, KnowledgeBaseFixture>,
  ): Promise<void> {
    for (const name of workspace.knowledgeBaseNames ?? []) {
      const origin = this.requireFixtureRecord(
        knowledgeBases,
        name,
        'knowledge base',
      );
      const fixture = this.requireFixtureRecord(
        fixtures,
        name,
        'knowledge base',
      );
      const copy = await this.findOrCreate(
        this.repo(KnowledgeBaseRecord),
        { workspaceId, name },
        () => ({
          id: randomUUID(),
          orgId: origin.orgId,
          userId: null,
          workspaceId,
          name: origin.name,
          description: origin.description,
          originKnowledgeBaseId: origin.id,
          importedOriginVersion: origin.version,
        }),
        { entity: 'WorkspaceKnowledgeBase', name },
      );
      for (const document of fixture.documents) {
        await this.seedDocument(document, copy.id);
      }
    }
  }

  private async seedWorkspaceDocuments(
    workspaceId: UUID,
    documents: readonly SeedDocumentFixture[],
  ): Promise<void> {
    for (const document of documents) {
      const source = await this.seedDocument(document, null, workspaceId);
      await this.findOrCreate(
        this.repo(WorkspaceSourceAssignmentRecord),
        { workspaceId, sourceId: source.id },
        () => ({ id: randomUUID(), workspaceId, sourceId: source.id }),
        { entity: 'WorkspaceSourceAssignment', name: document.name },
      );
    }
  }

  private async seedDocument(
    document: SeedDocumentFixture,
    knowledgeBaseId: UUID | null,
    workspaceId?: UUID,
  ): Promise<TextSourceRecord> {
    const existing = await this.findSeedDocument(
      document,
      knowledgeBaseId,
      workspaceId,
    );
    if (existing) {
      log('Source', document.name, false);
      await this.refreshSeedDocument(existing, document);
      await this.seedDocumentDetails(existing, document.text);
      return existing;
    }

    const source = await this.repo(TextSourceRecord).save(
      this.repo(TextSourceRecord).create({
        id: randomUUID(),
        name: document.name,
        knowledgeBaseId,
        createdBy: SourceCreator.USER,
        status: SourceStatus.READY,
        processingError: null,
        processingStartedAt: null,
        textType: TextType.FILE,
        fileType: FileType.TXT,
        url: null,
        maxDepth: null,
      }),
    );
    log('Source', document.name, true);
    await this.seedDocumentDetails(source, document.text);
    return source;
  }

  private async refreshSeedDocument(
    source: TextSourceRecord,
    document: SeedDocumentFixture,
  ): Promise<void> {
    if (
      source.name === document.name &&
      source.status === SourceStatus.READY &&
      source.processingError === null
    ) {
      return;
    }
    source.name = document.name;
    source.status = SourceStatus.READY;
    source.processingError = null;
    await this.repo(TextSourceRecord).save(source);
  }

  private async findSeedDocument(
    document: SeedDocumentFixture,
    knowledgeBaseId: UUID | null,
    workspaceId?: UUID,
  ): Promise<TextSourceRecord | null> {
    const query = this.repo(TextSourceRecord)
      .createQueryBuilder('source')
      .where('source.name = :name', { name: document.name })
      .andWhere(
        knowledgeBaseId === null
          ? 'source.knowledgeBaseId IS NULL'
          : 'source.knowledgeBaseId = :knowledgeBaseId',
        { knowledgeBaseId },
      );

    if (workspaceId) {
      query
        .innerJoin(
          WorkspaceSourceAssignmentRecord,
          'assignment',
          'assignment.sourceId = source.id',
        )
        .andWhere('assignment.workspaceId = :workspaceId', { workspaceId });
    }

    return query.getOne();
  }

  private async seedDocumentDetails(
    source: TextSourceRecord,
    text: string,
  ): Promise<void> {
    const details = await this.findOrCreate(
      this.repo(FileSourceDetailsRecord),
      { source: { id: source.id } },
      () => ({ id: randomUUID(), source, text, fileType: FileType.TXT }),
      { entity: 'FileSourceDetails', name: source.name },
    );
    if (details.text !== text) {
      details.text = text;
      await this.repo(FileSourceDetailsRecord).save(details);
    }
    await this.seedContentChunk(details, text, source.id, source.name);
  }

  private async seedContentChunk(
    source: TextSourceDetailsRecord,
    content: string,
    sourceId: UUID,
    name: string,
  ): Promise<void> {
    const chunk = await this.findOrCreate(
      this.repo(SourceContentChunkRecord),
      { source: { id: source.id } },
      () => ({ id: randomUUID(), source, content, meta: {} }),
      { entity: 'SourceContentChunk', name },
    );
    if (chunk.content !== content) {
      chunk.content = content;
      await this.repo(SourceContentChunkRecord).save(chunk);
    }
    await this.seedRagIndex(sourceId, chunk, content, name);
  }

  private async seedRagIndex(
    sourceId: UUID,
    chunk: SourceContentChunkRecord,
    content: string,
    name: string,
  ): Promise<void> {
    const parent = await this.findOrCreate(
      this.repo(ParentChunkRecord),
      { relatedDocumentId: sourceId, relatedChunkId: chunk.id },
      () => ({
        id: randomUUID(),
        relatedDocumentId: sourceId,
        relatedChunkId: chunk.id,
        content,
      }),
      { entity: 'ParentChunk', name },
    );
    if (parent.content !== content) {
      parent.content = content;
      await this.repo(ParentChunkRecord).save(parent);
    }
    const embedding = buildSeedEmbedding(content);
    const child = await this.findOrCreate(
      this.repo(ChildChunkRecord),
      { parentId: parent.id },
      () => ({
        id: randomUUID(),
        parentId: parent.id,
        parent,
        embedding1024: embedding,
        embedding1536: null,
        embedding2560: null,
      }),
      { entity: 'ChildChunk', name },
    );
    if (hasDifferentEmbedding(child.embedding1024, embedding)) {
      child.embedding1024 = embedding;
      await this.repo(ChildChunkRecord).save(child);
    }
  }

  private requireFixtureRecord<T>(
    records: Map<string, T>,
    name: string,
    entity: string,
  ): T {
    const record = records.get(name);
    if (!record) {
      throw new Error(
        `Workspace fixture references unknown ${entity} "${name}"`,
      );
    }
    return record;
  }
}
