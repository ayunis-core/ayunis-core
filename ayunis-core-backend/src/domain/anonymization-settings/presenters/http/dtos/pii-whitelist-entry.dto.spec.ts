import { validate } from 'class-validator';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { PiiWhitelistEntryDto } from 'src/domain/anonymization-settings/presenters/http/dtos/pii-whitelist-entry.dto';

function entryWithPattern(pattern: string | null): PiiWhitelistEntryDto {
  return Object.assign(new PiiWhitelistEntryDto(), {
    category: PiiCategory.LOCATION,
    pattern,
  });
}

describe(PiiWhitelistEntryDto.name, () => {
  it('accepts a pattern at the length limit', async () => {
    await expect(validate(entryWithPattern('a'.repeat(1000)))).resolves.toEqual(
      [],
    );
  });

  it('rejects a pattern exceeding the length limit', async () => {
    const errors = await validate(entryWithPattern('a'.repeat(1001)));

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });
});
