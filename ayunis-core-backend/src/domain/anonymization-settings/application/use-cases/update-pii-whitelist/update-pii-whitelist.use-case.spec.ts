import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { UpdatePiiWhitelistUseCase } from './update-pii-whitelist.use-case';
import { UpdatePiiWhitelistCommand } from './update-pii-whitelist.command';
import type { AnonymizationWhitelistRepository } from '../../ports/anonymization-whitelist.repository';
import {
  DuplicateCategoryError,
  InvalidPatternError,
} from '../../anonymization-settings.errors';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { AnonymizationWhitelistEntry } from '../../../domain/anonymization-whitelist-entry.entity';

describe('UpdatePiiWhitelistUseCase', () => {
  const orgId = '0d4f9c5e-7a36-4b34-9c1b-2f8d6a1e5b3c' as UUID;
  let useCase: UpdatePiiWhitelistUseCase;
  let replaceForOrg: jest.Mock;

  beforeEach(() => {
    replaceForOrg = jest
      .fn()
      .mockImplementation(
        (_orgId: UUID, entries: AnonymizationWhitelistEntry[]) =>
          Promise.resolve(entries),
      );
    const repository = {
      findByOrgId: jest.fn(),
      replaceForOrg,
    } as unknown as AnonymizationWhitelistRepository;
    useCase = new UpdatePiiWhitelistUseCase(repository);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('replaces the whitelist with validated entries', async () => {
    const result = await useCase.execute(
      new UpdatePiiWhitelistCommand(orgId, [
        { category: PiiCategory.EMAIL_ADDRESS, pattern: null },
        { category: PiiCategory.PERSON_NAME, pattern: 'dani(el)?' },
      ]),
    );

    expect(replaceForOrg).toHaveBeenCalledWith(orgId, expect.any(Array));
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      orgId,
      category: PiiCategory.EMAIL_ADDRESS,
      pattern: null,
    });
  });

  it('clears the whitelist when given no entries', async () => {
    const result = await useCase.execute(
      new UpdatePiiWhitelistCommand(orgId, []),
    );

    expect(replaceForOrg).toHaveBeenCalledWith(orgId, []);
    expect(result).toHaveLength(0);
  });

  it('rejects a whitelist containing the same category twice', async () => {
    await expect(
      useCase.execute(
        new UpdatePiiWhitelistCommand(orgId, [
          { category: PiiCategory.LOCATION, pattern: null },
          { category: PiiCategory.LOCATION, pattern: 'Marl' },
        ]),
      ),
    ).rejects.toThrow(DuplicateCategoryError);
    expect(replaceForOrg).not.toHaveBeenCalled();
  });

  it('rejects a pattern with invalid regex syntax', async () => {
    await expect(
      useCase.execute(
        new UpdatePiiWhitelistCommand(orgId, [
          { category: PiiCategory.PERSON_NAME, pattern: '([' },
        ]),
      ),
    ).rejects.toThrow(InvalidPatternError);
    expect(replaceForOrg).not.toHaveBeenCalled();
  });

  it('rejects a pattern vulnerable to catastrophic backtracking', async () => {
    await expect(
      useCase.execute(
        new UpdatePiiWhitelistCommand(orgId, [
          { category: PiiCategory.URL_OR_IP, pattern: '(a+)+$' },
        ]),
      ),
    ).rejects.toThrow(InvalidPatternError);
    expect(replaceForOrg).not.toHaveBeenCalled();
  });

  it('rejects a pattern exceeding the length limit', async () => {
    await expect(
      useCase.execute(
        new UpdatePiiWhitelistCommand(orgId, [
          { category: PiiCategory.LOCATION, pattern: 'a'.repeat(201) },
        ]),
      ),
    ).rejects.toThrow(InvalidPatternError);
    expect(replaceForOrg).not.toHaveBeenCalled();
  });
});
