import { Injectable } from '@nestjs/common';
import { AvailabilityResponse } from '../schema/getAvailabilityResponse';
import { Availability } from '../../../domain/availability.entity';

@Injectable()
export class GetAvailabilityResponseMapper {
  toAvailabilities(response: AvailabilityResponse): Availability[] {
    return response.data.map((response) => this.toAvailability(response));
  }

  toAvailability(response: AvailabilityResponse['data'][number]): Availability {
    return new Availability({
      resourceId: response.resource_id.toString(),
      resourceName: response.resource_name,
      dates: Object.fromEntries(
        Object.entries(response.dates).map(([date, times]) => [
          date,
          { fromTime: times[0].time_from, toTime: times[0].time_to },
        ]),
      ),
    });
  }
}
