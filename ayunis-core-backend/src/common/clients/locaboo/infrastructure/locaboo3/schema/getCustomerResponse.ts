export type GetCustomerResponse = {
  data: Array<{
    id: number;
    company_name: string;
    first_name: string;
    last_name: string;
    created: string;
    customer_id: number;
    customer_number: number;
    customer_number_prefix: string;
    tags: [];
    groups?: Array<{
      id: number; // TODO what is this id?
      customer_id: number;
      key: 'customer_group_id'; // TODO is this hard coded?
      value: string; // The customer group ID as string?
      group: {
        id: number; // This seems to be the actual group id
        user_id: number;
        name: string;
        description: string;
        public_group: 0 | 1;
        defult_group: 0 | 1; // The typo is in the API
      };
    }>;
  }>;
};
