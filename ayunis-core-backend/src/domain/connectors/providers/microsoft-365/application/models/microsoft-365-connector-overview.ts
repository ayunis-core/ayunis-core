import type { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import {
  type Microsoft365Setup,
  readMicrosoft365Setup,
} from 'src/domain/connectors/providers/microsoft-365/domain/microsoft-365-connection';

/** What an admin may see of the connection: never its credentials. */
export interface Microsoft365ConnectorOverview {
  status: ConnectorStatus;
  setup: Microsoft365Setup | null;
}

export function toMicrosoft365ConnectorOverview(
  connector: Connector | null,
): Microsoft365ConnectorOverview {
  return {
    status: connector?.status ?? ConnectorStatus.NOT_SET_UP,
    setup: connector ? readMicrosoft365Setup(connector.setup) : null,
  };
}
