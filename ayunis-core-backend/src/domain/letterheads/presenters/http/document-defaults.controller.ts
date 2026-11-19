import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetDocumentDefaultsUseCase } from 'src/domain/letterheads/application/use-cases/get-document-defaults/get-document-defaults.use-case';
import { UpdateDocumentDefaultsUseCase } from 'src/domain/letterheads/application/use-cases/update-document-defaults/update-document-defaults.use-case';
import {
  DocumentTypographyDto,
  UpdateDocumentDefaultsDto,
} from './dtos/document-typography.dto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@ApiTags('document-defaults')
@Controller('document-defaults')
export class DocumentDefaultsController {
  constructor(
    private readonly getDocumentDefaults: GetDocumentDefaultsUseCase,
    private readonly updateDocumentDefaults: UpdateDocumentDefaultsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get the current organization’s document defaults',
    description: 'Available to authenticated organization members.',
  })
  @ApiResponse({ status: 200, type: DocumentTypographyDto })
  async find(): Promise<DocumentTypographyDto> {
    return this.getDocumentDefaults.execute();
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update the current organization’s document defaults',
    description: 'Omitted fields are preserved. Send null to reset a field.',
  })
  @ApiResponse({ status: 200, type: DocumentTypographyDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 403,
    description: 'User is not an organization admin',
  })
  async update(
    @Body() dto: UpdateDocumentDefaultsDto,
  ): Promise<DocumentTypographyDto> {
    return this.updateDocumentDefaults.execute(dto);
  }
}
