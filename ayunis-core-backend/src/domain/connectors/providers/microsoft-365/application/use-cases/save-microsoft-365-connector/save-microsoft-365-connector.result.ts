import type { Microsoft365ConnectionTestResult } from 'src/domain/connectors/providers/microsoft-365/application/models/microsoft-365-connection-test-result';
import type { Microsoft365ConnectorOverview } from 'src/domain/connectors/providers/microsoft-365/application/models/microsoft-365-connector-overview';

/** The saved connection, tested right away. */
export interface SavedMicrosoft365Connector extends Microsoft365ConnectorOverview {
  connectionTest: Microsoft365ConnectionTestResult;
}
