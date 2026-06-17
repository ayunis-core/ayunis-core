/* eslint-disable sonarjs/no-hardcoded-ip -- test fixtures require hardcoded IPs */
import type { UUID } from 'crypto';
import { IpAllowlist } from './ip-allowlist.entity';
import { EmptyCidrsError, InvalidCidrError } from './ip-allowlist.errors';

describe('IpAllowlist', () => {
  const orgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;

  it('should create an entity with valid CIDRs', () => {
    const entity = new IpAllowlist({
      orgId,
      cidrs: ['192.168.1.0/24', '10.0.0.0/8'],
    });

    expect(entity.orgId).toBe(orgId);
    expect(entity.cidrs).toEqual(['192.168.1.0/24', '10.0.0.0/8']);
  });

  it('should generate a default UUID when id is not provided', () => {
    const entity = new IpAllowlist({ orgId, cidrs: ['10.0.0.0/8'] });

    expect(entity.id).toBeDefined();
    expect(entity.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('should use the provided id when given', () => {
    const id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' as UUID;
    const entity = new IpAllowlist({ id, orgId, cidrs: ['10.0.0.0/8'] });

    expect(entity.id).toBe(id);
  });

  it('should set default createdAt and updatedAt', () => {
    const before = new Date();
    const entity = new IpAllowlist({ orgId, cidrs: ['10.0.0.0/8'] });
    const after = new Date();

    expect(entity.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(entity.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(entity.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('should throw InvalidCidrError for a single invalid CIDR', () => {
    expect(() => new IpAllowlist({ orgId, cidrs: ['not-a-cidr'] })).toThrow(
      InvalidCidrError,
    );
  });

  it('should throw InvalidCidrError when one of multiple CIDRs is invalid', () => {
    expect(
      () =>
        new IpAllowlist({
          orgId,
          cidrs: ['192.168.1.0/24', 'bad-cidr', '10.0.0.0/8'],
        }),
    ).toThrow(InvalidCidrError);
  });

  it('should throw InvalidCidrError with the offending CIDR value', () => {
    try {
      new IpAllowlist({ orgId, cidrs: ['garbage'] });
      fail('Expected InvalidCidrError');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidCidrError);
      expect((error as InvalidCidrError).message).toContain('garbage');
    }
  });

  it('should throw EmptyCidrsError for an empty CIDR array', () => {
    expect(() => new IpAllowlist({ orgId, cidrs: [] })).toThrow(
      EmptyCidrsError,
    );
  });

  it('should include a descriptive message for empty CIDR array', () => {
    try {
      new IpAllowlist({ orgId, cidrs: [] });
      fail('Expected EmptyCidrsError');
    } catch (error) {
      expect(error).toBeInstanceOf(EmptyCidrsError);
      expect((error as EmptyCidrsError).message).toBe(
        'At least one CIDR range is required',
      );
    }
  });
});
