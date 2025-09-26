import { Injectable } from '@nestjs/common';
import { GetCustomerResponse } from '../schema/getCustomerResponse';
import { CustomerGroup } from '../../../domain/customer-group.entity';

@Injectable()
export class GetCustomerGroupsResponseMapper {
  toCustomerGroups(response: GetCustomerResponse): CustomerGroup[] {
    return response.data.flatMap((response) =>
      this.responseItemToCustomerGroup(response),
    );
  }

  responseItemToCustomerGroup(
    response: GetCustomerResponse['data'][number],
  ): CustomerGroup[] {
    if (!response.groups) {
      return [];
    }
    return response.groups
      .map(
        (group) =>
          new CustomerGroup({
            id: group.group.id.toString(),
            name: group.group.name,
          }),
      )
      .reduce<CustomerGroup[]>((acc, group) => {
        if (acc.some((g) => g.id === group.id)) {
          // If the group already exists, don't add it again
          return acc;
        }
        return [...acc, group];
      }, []);
  }
}
