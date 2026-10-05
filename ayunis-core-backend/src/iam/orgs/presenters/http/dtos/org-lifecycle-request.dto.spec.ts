import { validate } from 'class-validator';
import {
  SetOrgArchivedRequestDto,
  DeleteOrgRequestDto,
} from './org-lifecycle-request.dto';
describe('Org lifecycle HTTP validation', () => {
  it.each([undefined, null, 'true', 1])(
    'rejects invalid archive state %p',
    async (archived) => {
      expect(
        await validate(
          Object.assign(new SetOrgArchivedRequestDto(), { archived }),
        ),
      ).not.toHaveLength(0);
    },
  );
  it.each([undefined, null, 15, ''])(
    'requires typed name confirmation %p',
    async (confirmationName) => {
      expect(
        await validate(
          Object.assign(new DeleteOrgRequestDto(), { confirmationName }),
        ),
      ).not.toHaveLength(0);
    },
  );
});
