import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import {
  BrokerIdentityAdminClient,
  type BrokerUser,
} from 'src/iam/sso/application/ports/broker-identity-admin.client';
import {
  SsoBrokerIdentityCleanupNotConfiguredError,
  SsoBrokerRequestFailedError,
} from 'src/iam/sso/application/sso.errors';

const PROVIDER = { provider: 'zitadel' };
const REQUEST_TIMEOUT_MS = 10_000;
const PAGE_SIZE = 100;

interface Credentials {
  issuer: string;
  token: string;
}

interface ListUsersResponse {
  result?: { userId: string; details: { creationDate: string } }[];
}

interface ListIdpLinksResponse {
  result?: unknown[];
}

type UserQuery = Record<string, unknown>;

/**
 * Calls ZITADEL's v2 user and organization APIs with the identity cleanup
 * service user's token. The API lives on the issuer's host.
 */
@Injectable()
export class ZitadelIdentityAdminClient extends BrokerIdentityAdminClient {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  isConfigured(): boolean {
    return this.credentials() !== null;
  }

  listHumanUsers(organizationId: string): Promise<BrokerUser[]> {
    return this.searchUsers([
      { organizationIdQuery: { organizationId } },
      { typeQuery: { type: 'TYPE_HUMAN' } },
    ]);
  }

  async findExistingUserIds(userIds: string[]): Promise<string[]> {
    const existing: string[] = [];
    for (let start = 0; start < userIds.length; start += PAGE_SIZE) {
      const users = await this.searchUsers([
        {
          inUserIdsQuery: { userIds: userIds.slice(start, start + PAGE_SIZE) },
        },
      ]);
      existing.push(...users.map((user) => user.id));
    }
    return existing;
  }

  async hasIdentityProviderLink(userId: string): Promise<boolean> {
    const response = await this.request(
      'list identity provider links',
      'POST',
      `/v2/users/${encodeURIComponent(userId)}/links/_search`,
      { query: { limit: 1 } },
    );
    const body = (await response.json()) as ListIdpLinksResponse;
    return (body.result?.length ?? 0) > 0;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request(
      'delete user',
      'DELETE',
      `/v2/users/${encodeURIComponent(userId)}`,
      undefined,
      [404],
    );
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    // ZITADEL answers 200 for an organization that is already gone.
    await this.request(
      'delete organization',
      'DELETE',
      `/v2/organizations/${encodeURIComponent(organizationId)}`,
    );
  }

  private async searchUsers(queries: UserQuery[]): Promise<BrokerUser[]> {
    const users: BrokerUser[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const response = await this.request('list users', 'POST', '/v2/users', {
        query: { offset, limit: PAGE_SIZE, asc: true },
        sortingColumn: 'USER_FIELD_NAME_CREATION_DATE',
        queries,
      });
      const page = ((await response.json()) as ListUsersResponse).result ?? [];
      users.push(
        ...page.map((user) => ({
          id: user.userId,
          createdAt: new Date(user.details.creationDate),
        })),
      );
      if (page.length < PAGE_SIZE) return users;
    }
  }

  private async request(
    operation: string,
    method: 'POST' | 'DELETE',
    path: string,
    body?: object,
    acceptedStatuses: number[] = [],
  ): Promise<Response> {
    const { issuer, token } = this.requireCredentials();
    let response: Response;
    try {
      response = await fetch(new URL(path, issuer), {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw wrapProviderFailure(error, PROVIDER) ?? error;
    }
    if (!response.ok && !acceptedStatuses.includes(response.status)) {
      throw new SsoBrokerRequestFailedError(operation, response.status);
    }
    return response;
  }

  private requireCredentials(): Credentials {
    const credentials = this.credentials();
    if (!credentials) throw new SsoBrokerIdentityCleanupNotConfiguredError();
    return credentials;
  }

  private credentials(): Credentials | null {
    const issuer = this.configService.get<string>('ssoOidc.issuer');
    const token = this.configService.get<string>(
      'ssoOidc.identityCleanupToken',
    );
    return issuer && token ? { issuer, token } : null;
  }
}
