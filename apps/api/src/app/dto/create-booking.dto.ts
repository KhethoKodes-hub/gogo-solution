import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @Type(() => Number)
  @IsInt()
  rout_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  shuttle_id?: number;

  @IsOptional()
  @IsString()
  route_start?: string;

  @IsOptional()
  @IsString()
  route_end?: string;

  @IsString()
  bus_capacity!: string;

  @IsString()
  booking_date!: string;

  @IsString()
  booking_time!: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customer_id?: number;

  @IsOptional()
  @IsEmail()
  customer_info?: string;

  @IsOptional()
  @IsString()
  contact_name?: string;

  @IsOptional()
  @IsString()
  contact_person_no?: string;
}
