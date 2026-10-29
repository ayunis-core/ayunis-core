import * as api from "./generated.js";
import type {
  PrepareExternalSubscriptionDto,
  ApplyExternalSubscriptionDto,
  ExternalSubscriptionLeaseDto,
} from "./generated.js";
export type {
  PrepareExternalSubscriptionDto,
  ApplyExternalSubscriptionDto,
  ExternalSubscriptionDataDto,
  ExternalBillingAddressDto,
  ExternalSubscriptionLinkDto,
  ExternalSubscriptionPreparationDto,
  ExternalSubscriptionLeaseDto,
  ExternalSubscriptionLeaseResultDto,
  ExternalSubscriptionResultDto,
} from "./generated.js";
export { ExternalSubscriptionDataDtoType } from "./generated.js";

export interface CoreClientConfig {
  baseUrl: string;
  token: string;
}

export interface CoreCallOptions {
  deliveryId?: string;
  signal?: AbortSignal;
}

function validateBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Core API requires HTTPS or local HTTP without credentials, query or fragment",
    );
  }
  return url.toString().replace(/\/$/, "");
}

function validateToken(token: string): void {
  if (!token.trim() || /[\r\n]/.test(token))
    throw new Error(
      "Core service token is required and must not contain line breaks",
    );
}

export function createCoreClient(config: CoreClientConfig) {
  const baseUrl = validateBaseUrl(config.baseUrl);
  validateToken(config.token);
  const options = (call: CoreCallOptions) => ({
    baseUrl,
    headers: {
      Authorization: `Bearer ${config.token}`,
      ...(call.deliveryId ? { "x-webhook-id": call.deliveryId } : {}),
    },
    signal: call.signal ?? AbortSignal.timeout(30_000),
  });
  return {
    prepareExternalSubscription(
      orgId: string,
      body: PrepareExternalSubscriptionDto,
      call: CoreCallOptions = {},
    ) {
      return api.prepareExternalSubscription(
        encodeURIComponent(orgId),
        body,
        options(call),
      );
    },
    applyExternalSubscription(
      orgId: string,
      body: ApplyExternalSubscriptionDto,
      call: CoreCallOptions = {},
    ) {
      return api.applyExternalSubscription(
        encodeURIComponent(orgId),
        body,
        undefined,
        options(call),
      );
    },
    listExternalSubscriptionLinks(
      ownerId?: string,
      call: CoreCallOptions = {},
    ) {
      return api.listExternalSubscriptionLinks({ ownerId }, options(call));
    },
    coordinateExternalSubscriptions(
      body: ExternalSubscriptionLeaseDto,
      call: CoreCallOptions = {},
    ) {
      return api.coordinateExternalSubscriptions(body, options(call));
    },
  };
}

export type CoreClient = ReturnType<typeof createCoreClient>;

export type { CoreApiResponse } from "./transport.js";
