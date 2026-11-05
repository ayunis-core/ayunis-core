import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertOrgChatSettingsDto } from './upsert-org-chat-settings.dto';

describe('UpsertOrgChatSettingsDto', () => {
  it.each([
    { internetSearchEnabled: false },
    { anonymousModeByDefault: true },
    { anonymousModeByDefault: false },
    { memoryEnabled: true },
    { memoryEnabled: false },
  ])('accepts partial boolean settings %j', async (body) => {
    expect(
      await validate(plainToInstance(UpsertOrgChatSettingsDto, body)),
    ).toEqual([]);
  });
  it.each([
    {},
    { internetSearchEnabled: null },
    { anonymousModeByDefault: null },
    { anonymousModeByDefault: 'true' },
    { memoryEnabled: null },
    { memoryEnabled: 'true' },
  ])('rejects invalid settings %j', async (body) => {
    expect(
      await validate(plainToInstance(UpsertOrgChatSettingsDto, body)),
    ).not.toEqual([]);
  });
});
