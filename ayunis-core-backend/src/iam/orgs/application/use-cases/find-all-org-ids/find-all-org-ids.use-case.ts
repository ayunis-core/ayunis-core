import { Injectable } from '@nestjs/common';
import { OrgsRepository } from '../../ports/orgs.repository';
import { UUID } from 'crypto';

@Injectable()
export class FindAllOrgIdsUseCase {
  constructor(private readonly orgsRepository: OrgsRepository) {}

  async execute(): Promise<UUID[]> {
    return this.orgsRepository.findAllIds();
  }
}
