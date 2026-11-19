export interface BrokerUser {
  id: string;
  createdAt: Date;
}

/**
 * Administrative access to the identity broker, limited to what Core needs
 * to remove broker identities and organizations it no longer uses. The user
 * IDs are the subjects of Core's federated identities.
 */
export abstract class BrokerIdentityAdminClient {
  abstract isConfigured(): boolean;
  abstract listHumanUsers(organizationId: string): Promise<BrokerUser[]>;
  abstract findExistingUserIds(userIds: string[]): Promise<string[]>;
  abstract hasIdentityProviderLink(userId: string): Promise<boolean>;
  /** Succeeds when the user no longer exists. */
  abstract deleteUser(userId: string): Promise<void>;
  /** Succeeds when the organization no longer exists. */
  abstract deleteOrganization(organizationId: string): Promise<void>;
}
