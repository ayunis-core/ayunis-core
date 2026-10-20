import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';

export class ExternalBillingAddressDto {
  @ApiProperty() @IsString() @MaxLength(500) companyName: string;
  @ApiProperty() @IsString() @MaxLength(500) street: string;
  @ApiProperty() @IsString() @MaxLength(100) houseNumber: string;
  @ApiProperty() @IsString() @MaxLength(100) postalCode: string;
  @ApiProperty() @IsString() @MaxLength(500) city: string;
  @ApiProperty() @IsString() @MaxLength(100) country: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vatNumber?: string;
}
export class ExternalSubscriptionDataDto {
  @ApiProperty({ enum: SubscriptionType })
  @IsEnum(SubscriptionType)
  type: SubscriptionType;
  @ApiProperty({ format: 'date-time' }) @IsDateString() startsAt: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @ValidateIf((v: ExternalSubscriptionDataDto) => v.cancelledAt !== null)
  @IsDateString()
  cancelledAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @ValidateIf((v: ExternalSubscriptionDataDto) => v.endsAt !== null)
  @IsDateString()
  endsAt: string | null;
  @ApiPropertyOptional({ type: Number })
  @ValidateIf(
    (v: ExternalSubscriptionDataDto) =>
      v.type === SubscriptionType.SEAT_BASED || v.noOfSeats !== undefined,
  )
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  noOfSeats?: number;
  @ApiPropertyOptional({ type: Number })
  @ValidateIf(
    (v: ExternalSubscriptionDataDto) =>
      v.type === SubscriptionType.USAGE_BASED || v.monthlyCredits !== undefined,
  )
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  monthlyCredits?: number;
  @ApiProperty({ type: ExternalBillingAddressDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ExternalBillingAddressDto)
  billingInfo: ExternalBillingAddressDto;
}
export class ApplyExternalSubscriptionDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() revision: string;
  @ApiProperty() @IsString() @MaxLength(250) ownerId: string;
  @ApiProperty({ type: ExternalSubscriptionDataDto, nullable: true })
  @ValidateIf((v: ApplyExternalSubscriptionDto) => v.subscription !== null)
  @IsDefined()
  @ValidateNested()
  @Type(() => ExternalSubscriptionDataDto)
  subscription: ExternalSubscriptionDataDto | null;
  @ApiProperty() @IsBoolean() academyActive: boolean;
  @ApiProperty() @IsBoolean() revoke: boolean;
}
export class PrepareExternalSubscriptionDto {
  @ApiProperty({ enum: ['sync', 'cleanup'] }) @IsIn(['sync', 'cleanup']) mode:
    'sync' | 'cleanup';
}
export class ExternalSubscriptionResultDto {
  @ApiProperty() changed: boolean;
}
export class ExternalSubscriptionLinkDto {
  @ApiProperty({ format: 'uuid' }) orgId: string;
  @ApiProperty() ownerId: string;
}
export class ExternalSubscriptionPreparationDto {
  @ApiProperty({ format: 'uuid' }) revision: string;
}
export class ExternalSubscriptionLeaseDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() ownerId: string;
  @ApiProperty({ enum: ['acquire', 'release'] })
  @IsIn(['acquire', 'release'])
  action: 'acquire' | 'release';
}
export class ExternalSubscriptionLeaseResultDto {
  @ApiProperty() acquired: boolean;
}

export class ExternalSubscriptionLinksQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  ownerId?: string;
}
