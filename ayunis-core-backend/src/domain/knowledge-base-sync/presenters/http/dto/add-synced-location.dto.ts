import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AddSyncedLocationDto {
  @ApiProperty({
    description: 'The product whose connector syncs the location',
    enum: ConnectorProduct,
    enumName: 'ConnectorProduct',
  })
  @IsEnum(ConnectorProduct)
  product: ConnectorProduct;

  @ApiProperty({
    description:
      'The URL of the location, as the product resolved it (for SharePoint the `location` of a found resolution)',
    example:
      'https://contoso.sharepoint.com/sites/bauamt/Freigegebene%20Dokumente/Satzungen',
    maxLength: 2048,
  })
  @Transform(trim)
  // Shown to every member as a link, so nothing but an HTTPS URL.
  @IsString()
  @Matches(/^https:\/\/\S/i, { message: 'location must be an HTTPS URL' })
  @MaxLength(2048)
  location: string;
}
