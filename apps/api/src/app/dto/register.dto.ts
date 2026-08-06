import { IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsOptional()
  @IsIn(['admin', 'school'])
  role?: 'admin' | 'school';

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsInt()
  schoolId?: number;
}
