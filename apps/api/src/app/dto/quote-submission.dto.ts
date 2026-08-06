import { IsEmail, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteSubmissionDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+0-9()\-\s]{7,25}$/)
  phone?: string;

  @IsString()
  @Length(3, 40)
  tripType!: string;

  @IsString()
  @Length(8, 20)
  pickupDate!: string;

  @IsString()
  @Length(3, 20)
  pickupTime!: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  returnDate?: string;

  @IsOptional()
  @IsString()
  @Length(3, 20)
  returnTime?: string;

  @IsString()
  @Length(5, 300)
  collectionAddress!: string;

  @IsString()
  @Length(5, 300)
  destinationAddress!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengers?: number;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  serviceType?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  additionalDetails?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  estimate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vehicleBasePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vehiclePricePerKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  restOfDayPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  trailerAmount?: number;

  @IsOptional()
  @IsString()
  recaptchaToken?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  companyWebsite?: string;
}
