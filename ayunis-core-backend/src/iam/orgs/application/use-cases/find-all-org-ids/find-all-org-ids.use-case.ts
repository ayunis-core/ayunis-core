import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedOrgError } from 'src/iam/orgs/application/orgs.errors';
import { Injectable } from '@nestjs/common';
import { OrgsRepository } from '../../ports/orgs.repository';
import { UUID } from 'crypto';

@Injectable()
export class FindAllOrgIdsUseCase {
  constructor(private readonly orgsRepository: OrgsRepository) {}

  @HandleUnexpectedErrors(UnexpectedOrgError)
  async execute(): Promise<UUID[]> {
    return this.orgsRepository.findAllIds();
  }
}
