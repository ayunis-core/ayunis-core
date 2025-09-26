import { Injectable } from '@nestjs/common';
import { GetInvoiceResponse } from '../schema/getInvoiceRowsResponse';
import { InvoiceRow } from '../../../domain/invoice-row.entity';

@Injectable()
export class GetInvoiceRowsResponseMapper {
  toInvoiceRows(response: GetInvoiceResponse): InvoiceRow[] {
    return response.data
      .filter(
        (response) =>
          ['invoice', 'cancel', 'deposit'].includes(
            response.meta.invoice_type,
          ) &&
          // caution is payed back at the end of the booking
          !response.meta.is_caution,
      )
      .flatMap((response) => this.responseItemToInvoiceRow(response));
  }

  responseItemToInvoiceRow(
    response: GetInvoiceResponse['data'][number],
  ): InvoiceRow[] {
    const bookingRows: InvoiceRow[] = !response.booking
      ? []
      : Object.values(response.booking)
          .filter((booking) => booking.canceled === 0)
          .map(
            (booking) =>
              new InvoiceRow({
                customerId: response.meta.customer.id.toString(),
                resourceId: booking.resource_id.toString(),
                resourceName: booking.resource_text,
                bookingId: booking.instance_id.toString(),
                date: this.fuzzyConvertToDate(booking.date),
                totalPriceGross: parseFloat(booking.total),
                totalPriceNet: parseFloat(booking.price),
                tax: parseFloat(booking.tax_price),
              }),
          );
    const inventoryRows: InvoiceRow[] = !response.inventory
      ? []
      : Object.entries(response.inventory).map(
          ([inventory_id, inventory]) =>
            new InvoiceRow({
              customerId: response.meta.customer.id.toString(),
              resourceId: inventory.resource_id.toString(),
              resourceName: inventory.resource,
              inventoryId: inventory_id,
              date: this.fuzzyConvertToDate(inventory.date),
              totalPriceGross: parseFloat(inventory.total),
              totalPriceNet: parseFloat(inventory.price),
              tax: parseFloat(inventory.tax_price),
            }),
        );
    const serviceRows: InvoiceRow[] = !response.feature
      ? []
      : Object.entries(response.feature).map(
          ([service_id, inventory]) =>
            new InvoiceRow({
              customerId: response.meta.customer.id.toString(),
              resourceId: inventory.resource_id.toString(),
              resourceName: inventory.resource,
              bookingId: undefined,
              inventoryId: undefined,
              serviceId: service_id,
              date: this.fuzzyConvertToDate(inventory.date),
              totalPriceGross: parseFloat(inventory.total),
              totalPriceNet: parseFloat(inventory.price),
              tax: parseFloat(inventory.tax_price),
            }),
        );

    // TODO add person
    return [...bookingRows, ...inventoryRows, ...serviceRows];
  }

  private fuzzyConvertToDate(string: string | undefined): string {
    if (!string) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(string)) {
      return string;
    }
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(string)) {
      const [day, month, year] = string.split('.');
      return `${year}-${month}-${day}`;
    }
    throw new Error(`Could not parse date ${string}`);
  }
}
