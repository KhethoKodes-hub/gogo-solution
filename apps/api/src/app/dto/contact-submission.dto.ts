import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class ContactSubmissionDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^[+0-9()\-\s]{7,25}$/)
  phone!: string;

  @IsString()
  @Length(5, 1000)
  message!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  subject?: string;

  @IsOptional()
  @IsString()
  recaptchaToken?: string;

  @IsOptional()
  @IsString()
  companyWebsite?: string;
}
