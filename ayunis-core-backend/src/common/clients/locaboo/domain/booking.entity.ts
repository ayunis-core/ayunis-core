export class Booking {
  id: string;
  title: string;
  parentId: string;
  resourceId: string;
  resourceName: string;
  customerGroupIds: string[];
  fromDate: Date;
  toDate: Date;

  constructor(params: {
    id: string;
    title: string;
    parentId: string;
    resourceId: string;
    resourceName: string;
    customerGroupIds: string[];
    fromDate: Date;
    toDate: Date;
  }) {
    this.id = params.id;
    this.title = params.title;
    this.parentId = params.parentId;
    this.resourceId = params.resourceId;
    this.resourceName = params.resourceName;
    this.customerGroupIds = params.customerGroupIds;
    this.fromDate = params.fromDate;
    this.toDate = params.toDate;
  }
}
