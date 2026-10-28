import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBookingParams,
  GetAvailabilityParams,
  GetBookingsParams,
  GetInvoiceRowsParams,
  LocabooDataRepository,
} from 'src/common/clients/locaboo/application/ports/locaboo-data.repository';
import { Booking } from 'src/common/clients/locaboo/domain/booking.entity';
import { GetBookingsResponse } from './schema/getBookingsResponse';
import { GetBookingsResponseMapper } from './mappers/getBookingsResponse.mapper';
import { Resource } from 'src/common/clients/locaboo/domain/resource.entity';
import { GetResourcesResponse } from './schema/getResourcesReponse';
import { GetResourcesResponseMapper } from './mappers/getResourcesResponse.mapper';
import { Availability } from 'src/common/clients/locaboo/domain/availability.entity';
import { AvailabilityResponse } from './schema/getAvailabilityResponse';
import { GetAvailabilityResponseMapper } from './mappers/getAvailabilityResponse.mapper';
import { InvoiceRow } from 'src/common/clients/locaboo/domain/invoice-row.entity';
import { GetInvoiceResponse } from './schema/getInvoiceRowsResponse';
import { GetInvoiceRowsResponseMapper } from './mappers/getInvoiceRowsResponse.mapper';
import { CustomerGroup } from 'src/common/clients/locaboo/domain/customer-group.entity';
import { GetCustomerResponse } from './schema/getCustomerResponse';
import { GetCustomerGroupsResponseMapper } from './mappers/getCustomerGroupsResponse.mapper';

@Injectable()
export class Locaboo3Repository extends LocabooDataRepository {
  private readonly logger = new Logger(Locaboo3Repository.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly getBookingsResponseMapper: GetBookingsResponseMapper,
    private readonly getResourcesResponseMapper: GetResourcesResponseMapper,
    private readonly getAvailabilityResponseMapper: GetAvailabilityResponseMapper,
    private readonly getInvoiceRowsResponseMapper: GetInvoiceRowsResponseMapper,
    private readonly getCustomerGroupsResponseMapper: GetCustomerGroupsResponseMapper,
  ) {
    super();
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    this.logger.log({ endpointPath: endpoint.split('?')[0] }, 'fetch');
    const url = `${this.configService.get<string>('locaboo3.baseUrl')}${endpoint}`;
    const response = await fetch(url, options);
    if (!response.ok) {
      const responseText = await response.text();
      this.logger.error(
        {
          errorCode: response.status,
          response: JSON.parse(responseText) as unknown,
        },
        'Failed to fetch data from Locaboo API',
      );

      throw new Error(responseText);
    }

    return response.json() as T;
  }

  async createBooking(
    apiKey: string,
    params: CreateBookingParams,
  ): Promise<void> {
    const dateFrom = params.from.toISOString().split('T')[0];
    const dateTo = params.to.toISOString().split('T')[0];
    const timeFrom = params.from.getHours().toString().padStart(2, '0');
    const timeTo = params.to.getHours().toString().padStart(2, '0');
    await this.fetch(
      `/booking_save?api_secret_key=${apiKey}&resource_id=${params.resourceId}&date_from=${dateFrom}&time_from=${timeFrom}&date_to=${dateTo}&time_to${timeTo}&booking_title=${params.title}`,
      { method: 'POST' },
    );
  }

  async getBookings(
    apiKey: string,
    params: GetBookingsParams,
  ): Promise<Booking[]> {
    const dateFrom = params.dateFrom.toISOString().split('T')[0];
    const dateTo = params.dateTo.toISOString().split('T')[0];
    const limit = 15000;
    const offset = 0;
    const response = await this.fetch<GetBookingsResponse>(
      `/booking_list?date_from=${dateFrom}&date_to=${dateTo}&api_secret_key=${apiKey}&limit=${limit}&offset=${offset}`,
    );
    return this.getBookingsResponseMapper.toBookings(response);
  }

  async getResources(apiKey: string): Promise<Resource[]> {
    const response = await this.fetch<GetResourcesResponse>(
      `/resource_list?api_secret_key=${apiKey}`,
    );
    return this.getResourcesResponseMapper.toResources(response);
  }

  async getAvailability(
    apiKey: string,
    params: GetAvailabilityParams,
  ): Promise<Availability[]> {
    const dateFrom = params.from.toISOString().split('T')[0];
    const dateTo = params.to.toISOString().split('T')[0];
    const timeFrom = params.from.getHours().toString().padStart(2, '0');
    const timeTo = params.to.getHours().toString().padStart(2, '0');
    const response = await Promise.all(
      params.resourceIds.map(async (resourceId) =>
        this.fetch<AvailabilityResponse>(
          `/availability?api_secret_key=${apiKey}&resource_id=${resourceId}&date_from=${dateFrom}&time_from=${timeFrom}&date_to=${dateTo}&time_to${timeTo}&duration=${params.duration}`,
          { method: 'GET' },
        ),
      ),
    );
    return response.flatMap((response) =>
      this.getAvailabilityResponseMapper.toAvailabilities(response),
    );
  }

  async getInvoiceRows(
    apiKey: string,
    params: GetInvoiceRowsParams,
  ): Promise<InvoiceRow[]> {
    const response = await this.fetch<GetInvoiceResponse>(
      `/invoice_list?api_secret_key=${apiKey}`,
    );
    return this.getInvoiceRowsResponseMapper
      .toInvoiceRows(response)
      .filter((row) => this.matchesInvoiceRow(row, params));
  }

  private matchesInvoiceRow(
    row: InvoiceRow,
    params: GetInvoiceRowsParams,
  ): boolean {
    if (params.resourceNames.length > 0) {
      return this.matchesAny(params.resourceNames, row.resourceName);
    }
    if (params.resourceIds.length > 0) {
      return this.matchesAny(params.resourceIds, row.resourceId);
    }
    if (params.inventoryOrServiceIds.length > 0) {
      return this.matchesAny(
        params.inventoryOrServiceIds,
        row.inventoryId,
        row.serviceId,
      );
    }
    if (params.bookingIds.length > 0) {
      return this.matchesAny(params.bookingIds, row.bookingId);
    }
    return true;
  }

  private matchesAny(
    permittedValues: string[],
    ...actualValues: (string | undefined)[]
  ): boolean {
    return actualValues.some(
      (value) => value !== undefined && permittedValues.includes(value),
    );
  }

  async getCustomerGroups(apiKey: string): Promise<CustomerGroup[]> {
    const response = await this.fetch<GetCustomerResponse>(
      `/customer_list?api_secret_key=${apiKey}`,
    );
    return this.getCustomerGroupsResponseMapper.toCustomerGroups(response);
  }
}
