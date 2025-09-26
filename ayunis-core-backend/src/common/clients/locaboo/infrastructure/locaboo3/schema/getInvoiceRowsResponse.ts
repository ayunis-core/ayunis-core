export type GetInvoiceResponse = {
  data: Array<{
    invoice_number: string;
    document_date: string;
    meta: {
      customer: {
        id: number;
        name: string;
        company_name: string;
      };
      document_date: string;
      created: string;
      invoice_id: number;
      invoice_number: string;
      down_payment: number;
      total_price: number;
      currency: string;
      invoice_type: 'invoice' | 'offer' | 'order' | 'cancel' | 'deposit'; // If caution -> 'is_caution === 1'
      invoice_sent: boolean;
      processed_status: 'Yes' | 'No';
      approved: 0 | 1;
      status: number; // TODO What does that mean?
      offer_id: number; // The ID from where this invoice originated from
      is_caution: boolean; // See above if this is true, it's not relevant for profilt sums!!!
      final_discount_price: number;
    };
    booking: {
      [id: string]: {
        // The (buggy!!) instance id of the booking !!
        type: 'special' | 'recurring'; // special means single booking
        period: string; // A legacy string representation of 'from' & 'to'
        date: string;
        event_id: number; // The (top level) booking id
        instance_id: string; // USE THIS ONE FOR INSTANCE BOOKING_ID
        resource_id: number;
        resource_text: string; // Resource name or manually added text in invoice for custom rows
        units: number;
        units_accurate: number;
        unit_type: 'hours'; // TODO add more
        interval_price: number; // If this is -1, use the price for scale
        price_for_scale: number; // If the interval_price is > 0, ignore this
        tax: number; // % amount of tax
        price: string; // Total price excl. tax
        price_cost: number; // Just for display
        tax_price: string; // € Amount of tax
        booking_discount: number;
        total: string; // Total price incl. tax
        status: 0 | 1 | 2; // 0 = unpaid, 1 = paid, 2 = partially paid
        booking_status: 0 | 1; // If the booking was deleted after invoicing, this is 1 otherwise 0
        price_rule_id: string; // Id of the rate
        canceled: 0 | 1; // 0 = not canceled, 1 = canceled -- cancelled means that this row in the invoice is not relevant for the total price
        discount: number; // Total already respects this discount!
        discount_price: number; // Total already respects this discount!
        custom_fields: Array<string>; // !! Not regular custom fields, don't matter for calculation
      };
    };
    inventory: {
      [id: string]: {
        date: string;
        period: string;
        id: string;
        booking_id: string; // PARENT booking ID
        booking: string;
        resource_id: string; // PARENT resource ID
        resource: string;
        units: number;
        unit_type: string;
        tax: number;
        tax_price: string;
        price: string;
        total: string;
        status: 0 | 1 | 2; // 0 = unpaid, 1 = paid, 2 = partially paid
        booking_status: 0 | 1; // If the booking was deleted after invoicing, this is 1 otherwise 0
      };
    };
    feature: {
      // services
      [id: string]: {
        date: string;
        period: string;
        id: string;
        booking_id: string; // PARENT booking ID
        booking: string;
        resource_id: string; // PARENT resource ID
        resource: string;
        units: number;
        unit_type: string;
        tax: number;
        tax_price: string;
        price: string;
        total: string;
        status: 0 | 1 | 2; // 0 = unpaid, 1 = paid, 2 = partially paid
        booking_status: 0 | 1; // If the booking was deleted after invoicing, this is 1 otherwise 0
      };
    };
    calc: {
      total: {
        booking: number;
        booking_tax: number;
        inventory: number;
        inventory_tax: number;
        feature: number; // That means services
        feature_tax: number; // That means services
        person: number;
        person_tax: number;
        deposit: number;
        deposit_tax: number;
        booking_offer: number;
        offer: number; // proposal
        offer_tax: number; // proposal
        offer_price: number; // proposal
      };
      tax: { [key: string]: number }; // Array of tax rates and tax price as kv pairs
      tax_from: { [key: string]: number }; // Array of tax rates and subtotal kv pairs
    };
  }>;
};
