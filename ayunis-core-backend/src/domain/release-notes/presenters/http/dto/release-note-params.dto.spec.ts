import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReleaseNoteParamsDto } from './release-note-params.dto';

const errorsFor = (id: unknown) =>
  validate(plainToInstance(ReleaseNoteParamsDto, { id }));

describe('ReleaseNoteParamsDto', () => {
  it('accepts a UUID', async () => {
    await expect(
      errorsFor('55555555-5555-4555-8555-555555555555'),
    ).resolves.toEqual([]);
  });

  it.each(['not-a-uuid', '', undefined, 42])(
    'rejects %j as the id',
    async (id) => {
      const [error] = await errorsFor(id);

      expect(error.property).toBe('id');
      expect(error.constraints).toHaveProperty('isUuid');
    },
  );
});
