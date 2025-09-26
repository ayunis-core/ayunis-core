export class InvoiceRow {
  customerId: string;
  resourceId: string;
  resourceName: string;
  bookingId?: string;
  inventoryId?: string;
  serviceId?: string;
  date: string;
  totalPriceGross: number;
  totalPriceNet: number;
  tax: number;

  constructor(params: {
    customerId: string;
    resourceId: string;
    resourceName: string;
    bookingId?: string;
    inventoryId?: string;
    serviceId?: string;
    date: string;
    totalPriceGross: number;
    totalPriceNet: number;
    tax: number;
  }) {
    this.customerId = params.customerId;
    this.resourceId = params.resourceId;
    this.resourceName = params.resourceName;
    this.bookingId = params.bookingId;
    this.inventoryId = params.inventoryId;
    this.serviceId = params.serviceId;
    this.date = params.date;
    this.totalPriceGross = params.totalPriceGross;
    this.totalPriceNet = params.totalPriceNet;
    this.tax = params.tax;
  }
}
