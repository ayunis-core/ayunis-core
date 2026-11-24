import type { OparlCatalogBody } from 'src/domain/oparl/application/models/oparl-linked-body';
import type { OparlCatalogBodyResponseDto } from 'src/domain/oparl/presenters/http/dto/oparl-catalog-body-response.dto';

export function toOparlCatalogBodyResponseDto(
  body: OparlCatalogBody,
): OparlCatalogBodyResponseDto {
  return {
    id: body.id,
    name: body.name,
    shortName: body.shortName,
    web: body.web,
    systemName: body.systemName,
    linked: body.linkedAt !== null,
    linkedAt: body.linkedAt,
  };
}
