import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ResolveSharePointLocationDto {
  @ApiProperty({
    description:
      'A URL copied from SharePoint Online: a site, a document library or a folder',
    example:
      'https://contoso.sharepoint.com/sites/bauamt/Freigegebene%20Dokumente/Satzungen',
    maxLength: 2048,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;
}
