import { Body, Controller, Post } from '@nestjs/common';
import { ContactSubmissionDto } from './dto/contact-submission.dto';
import { NewsletterSubmissionDto } from './dto/newsletter-submission.dto';
import { QuoteSubmissionDto } from './dto/quote-submission.dto';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('submit')
  submit(@Body() payload: ContactSubmissionDto) {
    return this.contactService.submit(payload);
  }

  @Post('quote')
  submitQuote(@Body() payload: QuoteSubmissionDto) {
    return this.contactService.submitQuote(payload);
  }

  @Post('newsletter')
  submitNewsletter(@Body() payload: NewsletterSubmissionDto) {
    return this.contactService.submitNewsletter(payload);
  }
}
