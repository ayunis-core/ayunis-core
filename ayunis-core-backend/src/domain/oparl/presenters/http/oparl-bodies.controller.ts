import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { LinkOparlBodiesCommand } from 'src/domain/oparl/application/use-cases/link-oparl-bodies/link-oparl-bodies.command';
import { LinkOparlBodiesUseCase } from 'src/domain/oparl/application/use-cases/link-oparl-bodies/link-oparl-bodies.use-case';
import { ListOparlCatalogBodiesUseCase } from 'src/domain/oparl/application/use-cases/list-oparl-catalog-bodies/list-oparl-catalog-bodies.use-case';
import { UnlinkOparlBodyCommand } from 'src/domain/oparl/application/use-cases/unlink-oparl-body/unlink-oparl-body.command';
import { UnlinkOparlBodyUseCase } from 'src/domain/oparl/application/use-cases/unlink-oparl-body/unlink-oparl-body.use-case';
import { LinkOparlBodiesDto } from './dto/link-oparl-bodies.dto';
import { OparlCatalogBodyResponseDto } from './dto/oparl-catalog-body-response.dto';
import { toOparlCatalogBodyResponseDto } from './mappers/oparl-catalog-body-dto.mapper';

@ApiTags('OParl')
@Controller('oparl/bodies')
@Roles(UserRole.ADMIN)
@RequireFeature(FeatureFlag.Oparl)
@ApiForbiddenResponse({ description: 'Not an admin of the organization' })
export class OparlBodiesController {
  constructor(
    private readonly listCatalog: ListOparlCatalogBodiesUseCase,
    private readonly linkBodies: LinkOparlBodiesUseCase,
    private readonly unlinkBody: UnlinkOparlBodyUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the bodies of the OParl catalog',
    description:
      'Each body with its system and whether the organization linked it.',
  })
  @ApiOkResponse({ type: [OparlCatalogBodyResponseDto] })
  @ApiNotFoundResponse({ description: 'OParl is disabled' })
  async list(): Promise<OparlCatalogBodyResponseDto[]> {
    const bodies = await this.listCatalog.execute();
    return bodies.map(toOparlCatalogBodyResponseDto);
  }

  @Post('links')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Link bodies to the organization',
    description: 'A body the organization already linked stays linked.',
  })
  @ApiBody({ type: LinkOparlBodiesDto })
  @ApiNoContentResponse({ description: 'Linked' })
  @ApiNotFoundResponse({
    description:
      'OParl is disabled, or a body is not in the catalog (OPARL_BODY_NOT_FOUND); nothing was linked',
  })
  async link(@Body() dto: LinkOparlBodiesDto): Promise<void> {
    await this.linkBodies.execute(
      new LinkOparlBodiesCommand(dto.bodyIds as UUID[]),
    );
  }

  @Delete(':id/link')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unlink a body from the organization',
    description: 'Removes only the link; the mirrored data stays.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Unlinked' })
  @ApiNotFoundResponse({
    description:
      'OParl is disabled, or the organization has not linked the body (OPARL_BODY_NOT_LINKED)',
  })
  async unlink(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    await this.unlinkBody.execute(new UnlinkOparlBodyCommand(id));
  }
}
