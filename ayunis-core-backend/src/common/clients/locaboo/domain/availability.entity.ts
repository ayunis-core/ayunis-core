export class Availability {
  resourceId: string;
  resourceName: string;
  dates: {
    [date: string]: {
      fromTime: string;
      toTime: string;
    };
  };

  constructor(params: {
    resourceId: string;
    resourceName: string;
    dates: { [date: string]: { fromTime: string; toTime: string } };
  }) {
    this.resourceId = params.resourceId;
    this.resourceName = params.resourceName;
    this.dates = params.dates;
  }
}
