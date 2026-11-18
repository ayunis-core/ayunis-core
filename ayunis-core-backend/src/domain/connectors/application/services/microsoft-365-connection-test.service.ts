import { Injectable, Logger } from '@nestjs/common';
import { ProviderUnavailableError } from 'src/common/errors/provider.errors';
import { reportUnexpectedError } from 'src/common/errors/report-unexpected-error.helper';
import type { Microsoft365ConnectionTestResult } from 'src/domain/connectors/application/models/microsoft-365-connection-test-result';
import {
  EntraResource,
  EntraTokenRejection,
} from 'src/domain/connectors/application/ports/entra-app-token.port';
import type { Connector } from 'src/domain/connectors/domain/connector.entity';
import { Microsoft365ConnectionTestOutcome as Outcome } from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection-test-outcome.enum';
import { MICROSOFT_365_PERMISSIONS } from 'src/domain/connectors/domain/microsoft-365/microsoft-365-permissions';
import { Microsoft365AppTokenService } from './microsoft-365-app-token.service';

const OUTCOME_BY_REJECTION: Record<EntraTokenRejection, Outcome> = {
  [EntraTokenRejection.TENANT_NOT_FOUND]: Outcome.TENANT_NOT_FOUND,
  [EntraTokenRejection.CLIENT_NOT_FOUND]: Outcome.CLIENT_NOT_FOUND,
  [EntraTokenRejection.CLIENT_SECRET_INVALID]: Outcome.CLIENT_SECRET_INVALID,
  [EntraTokenRejection.CLIENT_SECRET_EXPIRED]: Outcome.CLIENT_SECRET_EXPIRED,
  [EntraTokenRejection.OTHER]: Outcome.REJECTED,
};

/**
 * Tests a Microsoft 365 connection by requesting an app-only token and
 * reading the permissions granted in it. It does not read the app
 * registration itself, which would need `Application.Read.All`.
 */
@Injectable()
export class Microsoft365ConnectionTestService {
  private readonly logger = new Logger(Microsoft365ConnectionTestService.name);

  constructor(private readonly appTokens: Microsoft365AppTokenService) {}

  async test(connector: Connector): Promise<Microsoft365ConnectionTestResult> {
    const result = await this.run(connector).catch((error: unknown) => {
      if (!(error instanceof ProviderUnavailableError)) throw error;
      // The admin sees the outage as the test's outcome; AppSignal still
      // gets it, as for any other provider outage.
      reportUnexpectedError(error);
      return testResult(Outcome.MICROSOFT_UNAVAILABLE);
    });
    this.logger.log(
      {
        orgId: connector.orgId,
        outcome: result.outcome,
        entraErrorCode: result.entraErrorCode,
      },
      'Tested Microsoft 365 connection',
    );
    return result;
  }

  private async run(
    connector: Connector,
  ): Promise<Microsoft365ConnectionTestResult> {
    const token = await this.appTokens.requestToken(
      connector,
      EntraResource.MICROSOFT_GRAPH,
    );
    if (token.status === 'rejected') {
      return testResult(
        OUTCOME_BY_REJECTION[token.reason],
        [],
        token.errorCode,
      );
    }
    if (token.roles.length === 0) {
      return testResult(await this.withoutGraphPermissions(connector));
    }
    const hasRequired = MICROSOFT_365_PERMISSIONS.every(
      ({ name, required }) => !required || token.roles.includes(name),
    );
    return testResult(
      hasRequired ? Outcome.CONNECTED : Outcome.REQUIRED_PERMISSION_MISSING,
      token.roles,
    );
  }

  /**
   * Entra issues a Graph token without roles both while admin consent is
   * missing and when the permissions were added on the SharePoint API
   * instead; only a SharePoint token tells the two apart.
   */
  private async withoutGraphPermissions(
    connector: Connector,
  ): Promise<Outcome> {
    const sharePoint = await this.appTokens.requestToken(
      connector,
      EntraResource.SHAREPOINT,
    );
    return sharePoint.status === 'issued' && sharePoint.roles.length > 0
      ? Outcome.CONSENT_ON_WRONG_API
      : Outcome.CONSENT_MISSING;
  }
}

function testResult(
  outcome: Outcome,
  roles: string[] = [],
  entraErrorCode: string | null = null,
): Microsoft365ConnectionTestResult {
  const used = new Set<string>(
    MICROSOFT_365_PERMISSIONS.map(({ name }) => name),
  );
  return {
    outcome,
    permissions: MICROSOFT_365_PERMISSIONS.map(({ name, required }) => ({
      name,
      required,
      granted: roles.includes(name),
    })),
    otherGrantedPermissions: roles
      .filter((role) => !used.has(role))
      .sort((a, b) => a.localeCompare(b)),
    entraErrorCode,
  };
}
