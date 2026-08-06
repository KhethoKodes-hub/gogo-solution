import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class M2mTokenDto {
  @IsString()
  @IsIn(['client_credentials'])
  grant_type!: 'client_credentials';

  @IsString()
  @MinLength(3)
  client_id!: string;

  @IsString()
  @MinLength(8)
  client_secret!: string;

  @IsOptional()
  @IsString()
  scope?: string;
}
