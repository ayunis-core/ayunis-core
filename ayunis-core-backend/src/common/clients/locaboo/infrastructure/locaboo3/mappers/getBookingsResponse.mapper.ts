import { Injectable } from '@nestjs/common';
import { Booking } from '../../../domain/booking.entity';
import { GetBookingsResponse } from '../schema/getBookingsResponse';

@Injectable()
export class GetBookingsResponseMapper {
  toBookings(response: GetBookingsResponse): Booking[] {
    return response.data.flatMap((booking) =>
      this.responseItemToBookings(booking),
    );
  }

  // One response items can contain multiple bookings
  // If it belongs to multiple resources, it will be returned as multiple bookings
  responseItemToBookings(
    response: GetBookingsResponse['data'][number],
  ): Booking[] {
    return response.resources.flatMap((resource) =>
      Object.values(resource.instances).map(
        (instance) =>
          new Booking({
            id: instance.id.toString(),
            title: response.title,
            parentId: response.id.toString(),
            resourceId: instance.resource_id.toString(),
            resourceName: instance.resource,
            customerGroupIds: response.customer_groups.map((group) =>
              group.id.toString(),
            ),
            fromDate: new Date(`${instance.from.replace(' ', 'T')}Z`),
            toDate: new Date(`${instance.to.replace(' ', 'T')}Z`),
          }),
      ),
    );
  }
}
