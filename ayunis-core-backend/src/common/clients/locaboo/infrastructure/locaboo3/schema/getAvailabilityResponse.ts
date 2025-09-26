export type AvailabilityResponse = {
  data: Array<{
    resource_id: number;
    resource_name: string;
    dates: {
      [date: string]: Array<{
        time_from: string;
        time_to: string;
      }>;
    };
  }>;
};
