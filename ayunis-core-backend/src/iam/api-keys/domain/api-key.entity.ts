import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class ApiKey {
  /**
   * The literal prefix that all Ayunis API key secrets start with.
   * Followed by a random base64url-encoded portion. The first
   * `LOOKUP_PREFIX_LENGTH` chars of the random portion are stored
   * indexed in the DB so incoming keys can be located in O(1) before
   * the bcrypt-compare against the stored hash.
   */
  static readonly KEY_PREFIX = 'ayk_live_';
  static readonly LOOKUP_PREFIX_LENGTH = 12;

  public id: UUID;
  public name: string;
  public prefix: string;
  public hash: string;
  public expiresAt: Date | null;
  public revokedAt: Date | null;
  public orgId: UUID;
  public createdByUserId: UUID | null;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    name: string;
    prefix: string;
    hash: string;
    expiresAt?: Date | null;
    revokedAt?: Date | null;
    orgId: UUID;
    createdByUserId: UUID | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.prefix = params.prefix;
    this.hash = params.hash;
    this.expiresAt = params.expiresAt ?? null;
    this.revokedAt = params.revokedAt ?? null;
    this.orgId = params.orgId;
    this.createdByUserId = params.createdByUserId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
