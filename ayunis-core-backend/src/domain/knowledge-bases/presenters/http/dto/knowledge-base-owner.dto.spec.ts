import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateKnowledgeBaseDto } from 'src/domain/knowledge-bases/presenters/http/dto/create-knowledge-base.dto';
import { ListKnowledgeBasesQueryDto } from 'src/domain/knowledge-bases/presenters/http/dto/list-knowledge-bases-query.dto';

async function errorsFor(type: new () => object, values: object) {
  return validate(plainToInstance(type, values));
}

describe('knowledge-base owner transport validation', () => {
  it.each([CreateKnowledgeBaseDto, ListKnowledgeBasesQueryDto])(
    'accepts personal ownership without a workspace id for %p',
    async (type) => {
      const errors = await errorsFor(type, {
        ownerType: 'personal',
        ...(type === CreateKnowledgeBaseDto ? { name: 'Permit guidance' } : {}),
      });

      expect(errors).toHaveLength(0);
    },
  );

  it.each([CreateKnowledgeBaseDto, ListKnowledgeBasesQueryDto])(
    'accepts workspace ownership with a workspace id for %p',
    async (type) => {
      const errors = await errorsFor(type, {
        ownerType: 'workspace',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        ...(type === CreateKnowledgeBaseDto ? { name: 'Permit guidance' } : {}),
      });

      expect(errors).toHaveLength(0);
    },
  );

  it.each([CreateKnowledgeBaseDto, ListKnowledgeBasesQueryDto])(
    'requires workspaceId for workspace ownership in %p',
    async (type) => {
      const errors = await errorsFor(type, {
        ownerType: 'workspace',
        ...(type === CreateKnowledgeBaseDto ? { name: 'Permit guidance' } : {}),
      });

      expect(errors.some(({ property }) => property === 'workspaceId')).toBe(
        true,
      );
    },
  );

  it.each([CreateKnowledgeBaseDto, ListKnowledgeBasesQueryDto])(
    'rejects workspaceId for personal ownership in %p',
    async (type) => {
      const errors = await errorsFor(type, {
        ownerType: 'personal',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        ...(type === CreateKnowledgeBaseDto ? { name: 'Permit guidance' } : {}),
      });

      expect(errors.some(({ property }) => property === 'workspaceId')).toBe(
        true,
      );
    },
  );

  it('rejects list limits above the supported maximum', async () => {
    const errors = await errorsFor(ListKnowledgeBasesQueryDto, {
      ownerType: 'personal',
      limit: 101,
    });

    expect(errors.some(({ property }) => property === 'limit')).toBe(true);
  });

  it('coerces and validates list pagination', async () => {
    const dto = plainToInstance(ListKnowledgeBasesQueryDto, {
      ownerType: 'workspace',
      workspaceId: '11111111-1111-4111-8111-111111111111',
      limit: '25',
      offset: '5',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ limit: 25, offset: 5 });
  });
});
