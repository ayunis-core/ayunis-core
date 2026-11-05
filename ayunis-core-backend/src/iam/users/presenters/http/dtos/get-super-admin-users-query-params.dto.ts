import {
  SortByQueryParam,
  SortOrderQueryParam,
} from 'src/common/sorting/sort-query-params.decorators';
import type { SortOrder } from 'src/common/sorting/sort';
import { SuperAdminUsersSortField } from 'src/iam/users/domain/value-objects/super-admin-users-sort.enum';
import { GetUsersQueryParamsDto } from 'src/iam/users/presenters/http/dtos/get-users-query-params.dto';

export class GetSuperAdminUsersQueryParamsDto extends GetUsersQueryParamsDto {
  @SortByQueryParam(
    SuperAdminUsersSortField,
    'SuperAdminUsersSortField',
    SuperAdminUsersSortField.CREATED_AT,
  )
  sortBy?: SuperAdminUsersSortField;

  @SortOrderQueryParam()
  sortOrder?: SortOrder;
}
