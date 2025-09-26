export type GetBookingsResponse = {
  data: Array<{
    id: number;
    title: string;
    type: 'special' | 'recurring';
    customer_groups: Array<{
      id: number;
      name: string;
    }>;
    resources: Array<{
      resource_id: number; // Always parent resource id
      resource: string;
      instances: {
        [instance_id: string]: {
          id: number;
          resource_id: number; // Either parent or resource part
          resource: string;
          from: string;
          to: string;
        };
      };
    }>;
    custom_fields: Array<{
      [resource_id: string]: {
        [custom_field_id: string]: {
          label: string;
          value: string; // TODO: what is this
          type: string; // TODO: add more types
          category: number;
          visibility: Array<'all'>;
        };
      };
    }>;
    inventories?: {
      [resource_id: string]: {
        [inventory_id: string]: Array<{
          id: number;
          inventory: string; // The name of the inventory
          quantity: string;
          price: number;
          interval:
            | 'per_minute'
            | 'per_hour'
            | 'per_day'
            | 'per_week'
            | 'per_month'
            | 'per_year';
        }>;
      };
    };
    services?: {
      [resource_id: string]: {
        [service_id: string]: Array<{
          id: number;
          service: string; // The name of the inventory
          quantity: string;
          price: number;
          interval:
            | 'per_minute'
            | 'per_hour'
            | 'per_day'
            | 'per_week'
            | 'per_month'
            | 'per_year';
        }>;
      };
    };
  }>;
  total: number;
  success: boolean;
};
