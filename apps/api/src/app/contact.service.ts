import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { ContactSubmissionDto } from './dto/contact-submission.dto';
import { NewsletterSubmissionDto } from './dto/newsletter-submission.dto';
import { QuoteSubmissionDto } from './dto/quote-submission.dto';
import { sanitizeEmail, sanitizeInput } from './contact.sanitize';
import { EmailTemplateService } from './email/email-template.service';
import { PriceEntity } from './entities/price.entity';
import { RouteEntity } from './entities/route.entity';
import { MailService } from './email/mail.service';
import { PdfGenerationService } from './pdf/pdf-generation.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly emailTemplates: EmailTemplateService,
    private readonly mailService: MailService,
    private readonly pdfGeneration: PdfGenerationService,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    @InjectRepository(PriceEntity)
    private readonly prices: Repository<PriceEntity>
  ) {}

  async submit(payload: ContactSubmissionDto) {
    const honeypot = (payload.companyWebsite ?? '').trim();
    if (honeypot) {
      throw new BadRequestException('Invalid submission');
    }

    const contact = {
      name: sanitizeInput(payload.name),
      email: sanitizeEmail(payload.email),
      phone: sanitizeInput(payload.phone),
      subject: sanitizeInput(payload.subject ?? 'General enquiry'),
      message: sanitizeInput(payload.message),
    };

    await this.verifyRecaptcha(payload.recaptchaToken);

    const mode = (this.config.get<string>('CONTACT_EMAIL_MODE') ?? 'log').toLowerCase();
    if (mode === 'smtp') {
      await this.sendViaSmtp(contact);
    } else {
      this.logger.log(`Contact submission (log mode): ${JSON.stringify(contact)}`);
    }

    return {
      ok: true,
      message: 'Thank you. Your request has been received.',
    };
  }

  async submitQuote(payload: QuoteSubmissionDto) {
    const honeypot = (payload.companyWebsite ?? '').trim();
    if (honeypot) {
      throw new BadRequestException('Invalid submission');
    }

    const tripType = this.normalizeTripType(payload.tripType);
    this.assertQuoteTripDates({
      tripType,
      pickupDate: payload.pickupDate,
      returnDate: payload.returnDate,
      returnTime: payload.returnTime,
    });

    const quote = {
      name: payload.name ? sanitizeInput(payload.name) : undefined,
      email: payload.email ? sanitizeEmail(payload.email) : undefined,
      phone: payload.phone ? sanitizeInput(payload.phone) : undefined,
      tripType,
      pickupDate: sanitizeInput(payload.pickupDate),
      pickupTime: sanitizeInput(payload.pickupTime),
      returnDate: payload.returnDate && tripType === 'return' ? sanitizeInput(payload.returnDate) : undefined,
      returnTime: payload.returnTime && tripType === 'return' ? sanitizeInput(payload.returnTime) : undefined,
      collectionAddress: sanitizeInput(payload.collectionAddress),
      destinationAddress: sanitizeInput(payload.destinationAddress),
      passengers: payload.passengers,
      serviceType: payload.serviceType ? sanitizeInput(payload.serviceType) : undefined,
      additionalDetails: payload.additionalDetails ? sanitizeInput(payload.additionalDetails) : undefined,
      estimate: undefined as string | undefined,
      distanceKm: payload.distanceKm,
      vehicleBasePrice: payload.vehicleBasePrice,
      vehiclePricePerKm: payload.vehiclePricePerKm,
      restOfDayPrice: payload.restOfDayPrice,
      trailerAmount: payload.trailerAmount,
    };

    quote.estimate = await this.estimateQuote(quote);

    await this.verifyRecaptcha(payload.recaptchaToken);

    const mode = (this.config.get<string>('CONTACT_EMAIL_MODE') ?? 'log').toLowerCase();
    if (mode === 'smtp') {
      await this.sendQuoteViaSmtp(quote);
    } else {
      this.logger.log(`Quote submission (log mode): ${JSON.stringify(quote)}`);
    }

    return {
      ok: true,
      message: 'Thank you. Your quote request has been received.',
    };
  }

  private normalizeTripType(input: string) {
    const normalized = sanitizeInput(input).toLowerCase();
    if (normalized === 'oneway' || normalized === 'one-way') {
      return 'oneway';
    }
    return 'return';
  }

  private assertQuoteTripDates(input: {
    tripType: 'oneway' | 'return';
    pickupDate: string;
    returnDate?: string;
    returnTime?: string;
  }) {
    if (input.tripType === 'oneway') {
      return;
    }

    const returnDate = (input.returnDate ?? '').trim();
    if (!returnDate) {
      throw new BadRequestException('Return date is required for return trips');
    }

    const pickupDate = new Date(input.pickupDate);
    const parsedReturnDate = new Date(returnDate);
    if (Number.isNaN(pickupDate.getTime()) || Number.isNaN(parsedReturnDate.getTime())) {
      throw new BadRequestException('Invalid pickup or return date');
    }

    if (parsedReturnDate.getTime() < pickupDate.getTime()) {
      throw new BadRequestException('Return date cannot be earlier than pickup date');
    }

    if (!(input.returnTime ?? '').trim()) {
      throw new BadRequestException('Return time is required for return trips');
    }
  }

  async submitNewsletter(payload: NewsletterSubmissionDto) {
    const honeypot = (payload.companyWebsite ?? '').trim();
    if (honeypot) {
      throw new BadRequestException('Invalid submission');
    }

    const newsletter = {
      email: sanitizeEmail(payload.email),
      name: payload.name ? sanitizeInput(payload.name) : undefined,
    };

    await this.verifyRecaptcha(payload.recaptchaToken);

    const mode = (this.config.get<string>('CONTACT_EMAIL_MODE') ?? 'log').toLowerCase();
    if (mode === 'smtp') {
      await this.sendNewsletterViaSmtp(newsletter);
    } else {
      this.logger.log(`Newsletter submission (log mode): ${JSON.stringify(newsletter)}`);
    }

    return {
      ok: true,
      message: 'You have been subscribed successfully.',
    };
  }

  private async verifyRecaptcha(token?: string) {
    const secret = this.config.get<string>('RECAPTCHA_SECRET_KEY');
    if (!secret) {
      return;
    }

    if (!token) {
      throw new BadRequestException('Security verification failed');
    }

    try {
      const expectedAction = this.config.get<string>('RECAPTCHA_EXPECTED_ACTION') ?? 'contact_submit';
      const minScore = Number(this.config.get<string>('RECAPTCHA_MIN_SCORE') ?? '0.5');
      const res = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        new URLSearchParams({ secret, response: token }).toString(),
        {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          timeout: 5000,
        }
      );

      const data = res.data as {
        success?: boolean;
        action?: string;
        score?: number;
      };

      if (!data.success) {
        throw new BadRequestException('Security verification failed');
      }

      if (data.action && data.action !== expectedAction) {
        throw new BadRequestException('Security verification failed');
      }

      if (typeof data.score === 'number' && data.score < minScore) {
        throw new BadRequestException('Security verification failed');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Recaptcha verification failed', error as Error);
      throw new BadRequestException('Security verification failed');
    }
  }

  private async sendViaSmtp(contact: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  }) {
    const replyTo = this.config.get<string>('MAIL_REPLY_TO') ?? contact.email;

    const ack = await this.emailTemplates.buildContactAcknowledgement(contact);
    const admin = await this.emailTemplates.buildContactNotification(contact);

    await this.mailService.sendDualEmail({
      ackTo: contact.email,
      replyTo,
      ack,
      notify: admin,
      failMessage: 'Unable to send confirmation email',
    });
  }

  private async sendQuoteViaSmtp(quote: {
    name?: string;
    email?: string;
    phone?: string;
    tripType: string;
    pickupDate: string;
    pickupTime: string;
    returnDate?: string;
    returnTime?: string;
    collectionAddress: string;
    destinationAddress: string;
    passengers?: number;
    serviceType?: string;
    additionalDetails?: string;
    estimate?: string;
    distanceKm?: number;
    vehicleBasePrice?: number;
    vehiclePricePerKm?: number;
    restOfDayPrice?: number;
    trailerAmount?: number;
  }) {

    const ack = await this.emailTemplates.buildQuoteAcknowledgement(quote);
    const admin = await this.emailTemplates.buildQuoteNotification(quote);

    let ackAttachments;
    try {
      const quotePdfHtml = await this.emailTemplates.buildQuoteEstimatePdfHtml(quote);
      const quotePdf = await this.pdfGeneration.renderHtmlToPdf(quotePdfHtml);
      const filenameSuffix = (quote.name ?? 'quote').replace(/[^a-zA-Z0-9-]+/g, '-') || String(Date.now());
      ackAttachments = [
        {
          filename: `GoGo-Quote-${filenameSuffix}.pdf`,
          content: quotePdf,
          contentType: 'application/pdf',
        },
      ];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Quote PDF generation failed: ${message}`);
    }

    await this.mailService.sendDualEmail({
      ackTo: quote.email,
      replyTo: quote.email,
      ack,
      notify: admin,
      failMessage: 'Unable to send quote confirmation email',
      ackAttachments,
    });
  }

  private async estimateQuote(quote: {
    tripType: string;
    pickupDate: string;
    returnDate?: string;
    collectionAddress: string;
    destinationAddress: string;
    passengers?: number;
    distanceKm?: number;
    vehicleBasePrice?: number;
    vehiclePricePerKm?: number;
    restOfDayPrice?: number;
    trailerAmount?: number;
  }) {
    const mode = (this.config.get<string>('QUOTE_ESTIMATE_MODE') ?? 'table').toLowerCase();
    if (mode === 'legacy-formula') {
      const legacy = this.estimateQuoteWithLegacyFormula(quote);
      if (legacy) {
        return legacy;
      }
    }

    return this.estimateQuoteFromPricingRules(quote);
  }

  private async estimateQuoteFromPricingRules(quote: {
    collectionAddress: string;
    destinationAddress: string;
    passengers?: number;
  }) {
    const matchedRoute = await this.matchRouteFromAddresses(
      quote.collectionAddress,
      quote.destinationAddress
    );
    if (!matchedRoute) {
      return undefined;
    }

    const pricingRows = await this.prices.find({
      where: [{ route_id: matchedRoute.id }, { rout_id: matchedRoute.id }],
      order: { id: 'ASC' },
    });

    const validRows = pricingRows.filter((row) => Number(row.round_price ?? row.price ?? 0) > 0);
    if (!validRows.length) {
      return undefined;
    }

    const selectedCapacity = this.pickCapacityForPassengers(
      validRows.map((row) => (row.shuttle_capacity ?? '').trim()).filter(Boolean),
      quote.passengers
    );

    const selectedRow = [...validRows]
      .reverse()
      .find((row) => (row.shuttle_capacity ?? '').trim() === selectedCapacity);
    if (!selectedRow) {
      return undefined;
    }

    const amount = Number(selectedRow.round_price ?? selectedRow.price ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return undefined;
    }

    return `R ${amount.toFixed(2)}`;
  }

  private estimateQuoteWithLegacyFormula(quote: {
    tripType: string;
    pickupDate: string;
    returnDate?: string;
    distanceKm?: number;
    vehicleBasePrice?: number;
    vehiclePricePerKm?: number;
    restOfDayPrice?: number;
    trailerAmount?: number;
  }) {
    const distanceKm = Number(quote.distanceKm ?? 0);
    const basePrice = Number(quote.vehicleBasePrice ?? 0);
    const pricePerKm = Number(quote.vehiclePricePerKm ?? 0);
    const restOfDayPrice = Number(quote.restOfDayPrice ?? 0);
    const trailerAmount = Number(quote.trailerAmount ?? 0);

    if (distanceKm <= 0 || !Number.isFinite(basePrice) || !Number.isFinite(pricePerKm)) {
      return undefined;
    }

    let total = 0;
    const normalizedTripType = (quote.tripType || '').toLowerCase();
    const isReturn = normalizedTripType === 'return';

    if (isReturn) {
      const doubledKm = distanceKm * 2;
      total = basePrice + pricePerKm * doubledKm;
      total += this.calculateLegacyReturnRestCharge(quote.pickupDate, quote.returnDate, restOfDayPrice);
    } else {
      total = basePrice + pricePerKm * distanceKm;
    }

    if (trailerAmount > 0) {
      total += trailerAmount;
    }

    if (!Number.isFinite(total) || total <= 0) {
      return undefined;
    }

    return `R ${total.toFixed(2)}`;
  }

  private calculateLegacyReturnRestCharge(pickupDateRaw: string, returnDateRaw: string | undefined, restOfDayPrice: number) {
    if (!returnDateRaw || returnDateRaw === pickupDateRaw || restOfDayPrice <= 0) {
      return 0;
    }

    const pickupDate = new Date(pickupDateRaw);
    const returnDate = new Date(returnDateRaw);
    if (Number.isNaN(pickupDate.getTime()) || Number.isNaN(returnDate.getTime())) {
      return 0;
    }

    const dayAfterPickup = new Date(pickupDate);
    dayAfterPickup.setDate(dayAfterPickup.getDate() + 1);
    const diffSeconds = Math.abs(returnDate.getTime() - dayAfterPickup.getTime()) / 1000;
    const dayDifference = Math.floor(diffSeconds / (60 * 60 * 24));
    return dayDifference > 0 ? restOfDayPrice * dayDifference : restOfDayPrice;
  }

  private async matchRouteFromAddresses(collectionAddress: string, destinationAddress: string) {
    const routes = await this.routes.find({ order: { id: 'ASC' } });
    const from = this.normalizeLocation(collectionAddress);
    const to = this.normalizeLocation(destinationAddress);

    let best: { score: number; route: RouteEntity } | null = null;
    for (const route of routes) {
      const routeStart = this.normalizeLocation(route.start || '');
      const routeEnd = this.normalizeLocation(route.end || '');

      const directScore = this.matchScore(from, to, routeStart, routeEnd);
      const reverseScore = this.matchScore(from, to, routeEnd, routeStart);
      const score = Math.max(directScore, reverseScore);
      if (score === 0) {
        continue;
      }

      if (!best || score > best.score) {
        best = { score, route };
      }
    }

    return best?.route;
  }

  private matchScore(from: string, to: string, fromPoint: string, toPoint: string) {
    const fromMatch = this.locationMentions(from, fromPoint);
    const toMatch = this.locationMentions(to, toPoint);
    if (fromMatch && toMatch) {
      return 2;
    }
    if (fromMatch || toMatch) {
      return 1;
    }
    return 0;
  }

  private locationMentions(input: string, routePoint: string) {
    if (!input || !routePoint) {
      return false;
    }

    return input.includes(routePoint) || routePoint.includes(input);
  }

  private normalizeLocation(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private pickCapacityForPassengers(capacities: string[], passengers?: number) {
    const parsed = capacities
      .map((capacity) => ({
        raw: capacity,
        seats: this.parseSeatCount(capacity),
      }))
      .sort((a, b) => a.seats - b.seats);

    if (!parsed.length) {
      return '';
    }

    if (!passengers || passengers < 1) {
      return parsed[0].raw;
    }

    const match = parsed.find((item) => item.seats >= passengers);
    return match?.raw ?? parsed[parsed.length - 1].raw;
  }

  private parseSeatCount(capacity: string) {
    const match = /\d+/.exec(capacity);
    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }

    return Number.parseInt(match[0], 10);
  }

  private async sendNewsletterViaSmtp(newsletter: { email: string; name?: string }) {
    const ack = await this.emailTemplates.buildNewsletterAcknowledgement(newsletter);
    const admin = await this.emailTemplates.buildNewsletterNotification(newsletter);

    await this.mailService.sendDualEmail({
      ackTo: newsletter.email,
      replyTo: newsletter.email,
      ack,
      notify: admin,
      failMessage: 'Unable to send newsletter confirmation email',
    });
  }
}
