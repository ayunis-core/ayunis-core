import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import {
  FynnClient,
  type FynnCustomerLink,
} from 'src/integrations/fynn/application/ports/fynn-client';
import type {
  FynnCustomer,
  FynnSubscription,
  FynnSubscriptionSummary,
  FynnEntitlement,
} from 'src/integrations/fynn/application/models/fynn-snapshot';
import {
  FynnApiError,
  FynnConfigurationError,
} from 'src/integrations/fynn/application/fynn.errors';
import {
  customerSchema,
  customerLinkSchema,
  subscriptionSchema,
  subscriptionSummarySchema,
  entitlementSchema,
  paginationSchema,
} from './fynn-response.schemas';

@Injectable()
export class FynnHttpClient extends FynnClient {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async getSubscription(id: string): Promise<FynnSubscription> {
    return this.readOne(
      `/subscriptions/${encodeURIComponent(id)}`,
      subscriptionSchema,
    );
  }
  async getCustomer(id: string): Promise<FynnCustomer> {
    return this.readOne(`/customers/${encodeURIComponent(id)}`, customerSchema);
  }
  async listCustomerLinks(): Promise<FynnCustomerLink[]> {
    return this.readAll('/customers', customerLinkSchema);
  }
  async listSubscriptions(
    customerId: string,
  ): Promise<FynnSubscriptionSummary[]> {
    return this.readAll('/subscriptions', subscriptionSummarySchema, {
      customer: customerId,
    });
  }
  async getEntitlements(id: string): Promise<FynnEntitlement[]> {
    return this.readAll(
      `/subscriptions/${encodeURIComponent(id)}/entitlements`,
      entitlementSchema,
    );
  }
  private async readOne<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const result = schema.safeParse(await this.request(path));
    if (!result.success) throw new FynnApiError();
    return result.data;
  }
  private async readAll<T extends { id: string }>(
    path: string,
    schema: z.ZodType<T>,
    filters: Record<string, string> = {},
  ): Promise<T[]> {
    const result: T[] = [];
    let total = Infinity;
    let page = 1;
    while (result.length < total) {
      const query = new URLSearchParams({
        page: String(page),
        limit: '100',
        ...filters,
      });
      const parsed = z
        .object({
          data: z.array(schema),
          meta: z.object({ pagination: paginationSchema }),
        })
        .safeParse(await this.request(`${path}?${query}`));
      if (!parsed.success) throw new FynnApiError();
      const batch = parsed.data;
      if (page > 1 && batch.meta.pagination.totalItems !== total)
        throw new FynnApiError();
      total = batch.meta.pagination.totalItems;
      if (batch.data.length === 0 && result.length < total)
        throw new FynnApiError();
      result.push(...batch.data);
      page++;
      if (result.length > total) throw new FynnApiError();
    }
    if (new Set(result.map((entry) => entry.id)).size !== result.length)
      throw new FynnApiError();
    return result;
  }
  private configuration(): { baseUrl: URL; apiKey: string } {
    const apiKey = this.config.get<string>('fynn.apiKey');
    const base = this.config.get<string>('fynn.baseUrl');
    if (!apiKey || !base) throw new FynnConfigurationError();
    return { baseUrl: this.validateBaseUrl(base), apiKey };
  }
  private validateBaseUrl(base: string): URL {
    let baseUrl: URL;
    try {
      baseUrl = new URL(base);
    } catch {
      throw new FynnConfigurationError();
    }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(
      baseUrl.hostname,
    );
    if (
      baseUrl.protocol !== 'https:' &&
      !(local && baseUrl.protocol === 'http:')
    )
      throw new FynnConfigurationError();
    if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash)
      throw new FynnConfigurationError();
    return baseUrl;
  }
  private async request(path: string): Promise<unknown> {
    const { baseUrl, apiKey } = this.configuration();
    const url = new URL(`${baseUrl.toString().replace(/\/$/, '')}${path}`);
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(
          this.config.get<number>('fynn.timeoutMs', 10_000),
        ),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw Object.assign(new Error('Fynn API request failed'), {
          status: response.status,
        });
      }
      return await response.json();
    } catch (error) {
      throw (
        wrapProviderFailure(error, { provider: 'fynn' }) ?? new FynnApiError()
      );
    }
  }
}
