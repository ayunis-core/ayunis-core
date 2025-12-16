export class SuperAdminGetAllOrgsQuery {
  public readonly search?: string;
  public readonly limit: number;
  public readonly offset: number;

  constructor(params?: { search?: string; limit?: number; offset?: number }) {
    this.search = params?.search;
    this.limit = params?.limit ?? 25;
    this.offset = params?.offset ?? 0;
  }
}
