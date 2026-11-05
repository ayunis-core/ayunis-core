import {
  SortByQueryParam,
  SortOrderQueryParam,
} from 'src/common/sorting/sort-query-params.decorators';
import type { SortOrder } from 'src/common/sorting/sort';
import { OrgUsersSortField } from 'src/iam/users/domain/value-objects/org-users-sort.enum';
import { GetUsersQueryParamsDto } from 'src/iam/users/presenters/http/dtos/get-users-query-params.dto';

export class GetOrgUsersQueryParamsDto extends GetUsersQueryParamsDto {
  @SortByQueryParam(
    OrgUsersSortField,
    'OrgUsersSortField',
    OrgUsersSortField.CREATED_AT,
  )
  sortBy?: OrgUsersSortField;

  @SortOrderQueryParam()
  sortOrder?: SortOrder;
}
