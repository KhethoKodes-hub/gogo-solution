import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class NewsletterSubmissionDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Length(2, 160)
  name?: string;

  @IsOptional()
  @IsString()
  recaptchaToken?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  companyWebsite?: string;
}
