import { OrgChatSettingsMapper } from './org-chat-settings.mapper';
import { OrgChatSettings } from '../../../../domain/org-chat-settings.entity';
import { OrgChatSettingsRecord } from '../schema/org-chat-settings.record';
import { randomUUID } from 'crypto';

describe('OrgChatSettingsMapper', () => {
  let mapper: OrgChatSettingsMapper;

  beforeEach(() => {
    mapper = new OrgChatSettingsMapper();
  });

  describe('round-trip: domain → record → domain', () => {
    it('should preserve all fields through a round-trip conversion', () => {
      const original = new OrgChatSettings({
        id: randomUUID(),
        orgId: randomUUID(),
        internetSearchEnabled: false,
        createdAt: new Date('2026-01-15T10:00:00Z'),
        updatedAt: new Date('2026-02-10T14:30:00Z'),
      });

      const record = mapper.toRecord(original);
      const restored = mapper.toDomain(record);

      expect(restored.id).toEqual(original.id);
      expect(restored.orgId).toEqual(original.orgId);
      expect(restored.internetSearchEnabled).toEqual(
        original.internetSearchEnabled,
      );
      expect(restored.createdAt).toEqual(original.createdAt);
      expect(restored.updatedAt).toEqual(original.updatedAt);
    });
  });

  describe('toDomain', () => {
    it('should convert a record to an OrgChatSettings domain entity', () => {
      const record = new OrgChatSettingsRecord();
      record.id = randomUUID();
      record.orgId = randomUUID();
      record.internetSearchEnabled = true;
      record.createdAt = new Date('2026-01-01T00:00:00Z');
      record.updatedAt = new Date('2026-01-02T00:00:00Z');

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(OrgChatSettings);
      expect(domain.id).toEqual(record.id);
      expect(domain.orgId).toEqual(record.orgId);
      expect(domain.internetSearchEnabled).toEqual(
        record.internetSearchEnabled,
      );
    });
  });

  describe('toRecord', () => {
    it('should convert a domain entity to an OrgChatSettingsRecord', () => {
      const domain = new OrgChatSettings({
        orgId: randomUUID(),
        internetSearchEnabled: false,
      });

      const record = mapper.toRecord(domain);

      expect(record).toBeInstanceOf(OrgChatSettingsRecord);
      expect(record.id).toEqual(domain.id);
      expect(record.orgId).toEqual(domain.orgId);
      expect(record.internetSearchEnabled).toEqual(
        domain.internetSearchEnabled,
      );
    });
  });
});
