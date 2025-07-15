import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateBillingInfoDto {
  @ApiProperty({
    description: 'Company name for the subscription',
    example: 'Acme Inc.',
    required: true,
  })
  @IsString()
  companyName: string;

  @ApiProperty({
    description: 'Street for the subscription',
    example: '123 Main St',
    required: true,
  })
  @IsString()
  street: string;

  @ApiProperty({
    description: 'House number for the subscription',
    example: '123',
    required: true,
  })
  @IsString()
  houseNumber: string;

  @ApiProperty({
    description: 'Postal code for the subscription',
    example: '12345',
    required: true,
  })
  @IsString()
  postalCode: string;

  @ApiProperty({
    description: 'City for the subscription',
    example: 'New York',
    required: true,
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'Country for the subscription',
    example: 'United States',
    required: true,
  })
  @IsString()
  country: string;

  @ApiProperty({
    description: 'VAT number for the subscription',
    example: '1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;
}
