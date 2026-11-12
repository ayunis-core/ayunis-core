import type { UUID } from 'crypto';
import type { McpToolAllowance } from 'src/domain/mcp/domain/mcp-tool-allowance.entity';

export abstract class McpToolAllowanceRepositoryPort {
  /**
   * Stores the allowance unless the user already allows the same tool of the
   * same integration; an existing entry is kept as it is.
   */
  abstract saveIfAbsent(allowance: McpToolAllowance): Promise<void>;

  abstract findByUser(userId: UUID): Promise<McpToolAllowance[]>;

  abstract findByUserAndIntegrationIds(
    userId: UUID,
    integrationIds: UUID[],
  ): Promise<McpToolAllowance[]>;

  /**
   * @returns false when the user has no allowance with this ID.
   */
  abstract deleteByIdAndUser(id: UUID, userId: UUID): Promise<boolean>;
}
