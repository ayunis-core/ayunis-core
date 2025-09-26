import { Booking } from '../../domain/booking.entity';
import { InvoiceRow } from '../../domain/invoice-row.entity';
import { Availability } from '../../domain/availability.entity';
import { Resource } from '../../domain/resource.entity';
import { CustomerGroup } from '../../domain/customer-group.entity';

export interface CreateBookingParams {
  from: Date;
  to: Date;
  resourceId: string;
  title: string;
}

export interface GetBookingsParams {
  dateFrom: Date;
  dateTo: Date;
  resourceIds: string[];
  inventoryOrServiceIds: string[];
  customerGroupIds: string[];
}

export interface GetAvailabilityParams {
  from: Date;
  to: Date;
  duration: number;
  resourceIds: string[];
}

export interface GetInvoiceRowsParams {
  dateFrom: Date;
  dateTo: Date;
  resourceIds: string[];
  resourceNames: string[];
  bookingIds: string[];
  inventoryOrServiceIds: string[];
}

export abstract class LocabooDataRepository {
  abstract createBooking(
    apiKey: string,
    params: CreateBookingParams,
  ): Promise<void>;
  abstract getBookings(
    apiKey: string,
    params: GetBookingsParams,
  ): Promise<Booking[]>;
  abstract getResources(apiKey: string): Promise<Resource[]>;
  abstract getAvailability(
    apiKey: string,
    params: GetAvailabilityParams,
  ): Promise<Availability[]>;
  abstract getInvoiceRows(
    apiKey: string,
    params: GetInvoiceRowsParams,
  ): Promise<InvoiceRow[]>;
  abstract getCustomerGroups(apiKey: string): Promise<CustomerGroup[]>;
}
