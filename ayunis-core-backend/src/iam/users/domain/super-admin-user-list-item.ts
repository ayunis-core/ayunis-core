import type { User } from 'src/iam/users/domain/user.entity';

export class SuperAdminUserListItem {
  public readonly user: User;
  public readonly orgName: string;

  constructor(params: { user: User; orgName: string }) {
    this.user = params.user;
    this.orgName = params.orgName;
  }
}
