import { Injectable } from '@nestjs/common';
import { GetResourcesResponse } from '../schema/getResourcesReponse';
import { Resource } from '../../../domain/resource.entity';

@Injectable()
export class GetResourcesResponseMapper {
  toResources(response: GetResourcesResponse): Resource[] {
    return response.data.map((resource) => this.toResource(resource));
  }

  toResource(response: GetResourcesResponse['data'][number]): Resource {
    return new Resource({
      id: response.id.toString(),
      name: response.title,
    });
  }
}
