import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { Repository } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { EmailTemplateService } from './email/email-template.service';
import { MailService } from './email/mail.service';
import { PdfGenerationService } from './pdf/pdf-generation.service';
import { PriceEntity } from './entities/price.entity';
import { RouteEntity } from './entities/route.entity';

type UploadFile = {
	size: number;
	mimetype: string;
	originalname: string;
	buffer: Buffer;
};

@Injectable()
export class BookingsService {
	private readonly logger = new Logger(BookingsService.name);

	constructor(
		@InjectRepository(BookingEntity)
		private readonly bookings: Repository<BookingEntity>,
		@InjectRepository(RouteEntity)
		private readonly routes: Repository<RouteEntity>,
		@InjectRepository(PriceEntity)
		private readonly prices: Repository<PriceEntity>,
		private readonly config: ConfigService,
		private readonly emailTemplates: EmailTemplateService,
		private readonly mailService: MailService,
		private readonly pdfGeneration: PdfGenerationService
	) {}

	async listMine(userId: number) {
		if (!userId) {
			throw new UnauthorizedException('Missing authenticated user');
		}

		return this.bookings.find({
			where: { customer_id: userId },
			order: { id: 'DESC' },
			take: 100,
		});
	}

	async createBooking(
		input: CreateBookingDto,
		principal?: { type?: string; sub?: number; email?: string; clientId?: string },
		file?: UploadFile
	) {
		const today = this.formatDate(new Date());
		const bookingDate = this.formatDate(new Date(input.booking_date));
		if (!bookingDate || bookingDate < today) {
			throw new BadRequestException('Please select a valid booking date.');
		}

		if (!input.booking_time) {
			throw new BadRequestException('Please select your booking time.');
		}

		const now = new Date();
		if (bookingDate === today) {
			const [hour, minute] = input.booking_time.split(':').map(Number);
			if (Number.isNaN(hour) || Number.isNaN(minute)) {
				throw new BadRequestException('Invalid booking time format.');
			}
			const bookingAt = new Date(now);
			bookingAt.setHours(hour, minute, 0, 0);
			if (bookingAt.getTime() <= now.getTime()) {
				throw new BadRequestException('Please select future time for booking.');
			}
		}

		const customerId = principal?.sub ?? input.customer_id ?? null;
		const customerInfo = principal?.email ?? input.customer_info ?? null;
		if (!customerId || !customerInfo) {
			throw new UnauthorizedException('Missing customer identity for booking creation');
		}

		const status = this.resolveStatus(now, bookingDate);
		const dateBooked = this.formatJohannesburgTimestamp(now);
		const pricing = await this.resolveBookingPricing(input);
		let purchaseOrderUrl: string | null = null;
		if (file) {
			purchaseOrderUrl = await this.savePurchaseOrder(file);
		}

		const booking = this.bookings.create({
			rout_id: input.rout_id,
			shuttle_id: input.shuttle_id ?? null,
			route_start: pricing.routeStart,
			route_end: pricing.routeEnd,
			bus_capacity: input.bus_capacity,
			booking_date: bookingDate,
			booking_time: input.booking_time,
			price: pricing.price,
			customer_id: customerId,
			customer_info: customerInfo,
			booking_status: status,
			purchase_order: purchaseOrderUrl,
			contact_name: input.contact_name ?? null,
			contact_person_no: input.contact_person_no ?? null,
			date_booked: dateBooked,
			last_updated: this.formatTimestamp(new Date()),
		});

		const inserted = await this.bookings.save(booking);
		const bookingId = `GOGO${inserted.id}G`;
		await this.bookings.update({ id: inserted.id }, { booking_id: bookingId });

		await this.sendBookingViaSmtp({
			bookingId,
			status,
			routeStart: pricing.routeStart,
			routeEnd: pricing.routeEnd,
			bookingDate,
			bookingTime: input.booking_time,
			busCapacity: input.bus_capacity,
			price: pricing.price,
			customerEmail: customerInfo,
			contactName: input.contact_name ?? undefined,
			contactPhone: input.contact_person_no ?? undefined,
			purchaseOrder: purchaseOrderUrl ?? undefined,
		});

		const pendingLike = status === 'PENDING' || status === 'EMERGENCY';
		const msg = pendingLike
			? `Your trip has been placed on tentative and will await confirmation from Gogo Shuttle.Your reference no is: ${bookingId}`
			: `Your trip has been placed successfully with GOGO shuttle.Your booking reference no is: ${bookingId}`;

		return {
			error: '0',
			msg,
			booking_id: bookingId,
			booking_status: status,
		};
	}

	private async resolveBookingPricing(input: CreateBookingDto) {
		const route = await this.routes.findOne({ where: { id: input.rout_id } });
		if (!route) {
			throw new BadRequestException('Selected route is not available.');
		}

		const row = await this.prices.findOne({
			where: [
				{ route_id: input.rout_id, shuttle_capacity: input.bus_capacity },
				{ rout_id: input.rout_id, shuttle_capacity: input.bus_capacity },
			],
			order: { id: 'DESC' },
		});

		if (!row) {
			throw new BadRequestException('Selected capacity is not available for this route.');
		}

		const amount = Number(row.round_price ?? row.price ?? 0);
		if (!Number.isFinite(amount) || amount <= 0) {
			throw new BadRequestException('Unable to determine booking price for the selected route and capacity.');
		}

		return {
			routeStart: route.start,
			routeEnd: route.end,
			price: amount.toFixed(2),
		};
	}

	async initiatePayfastPayment(bookingId: string) {
		if (!this.isPayfastEnabled()) {
			throw new BadRequestException('PayFast is currently disabled');
		}

		const normalizedId = (bookingId || '').trim();
		if (!normalizedId) {
			throw new BadRequestException('Missing booking reference');
		}

		const booking = await this.bookings.findOne({ where: { booking_id: normalizedId } });
		if (!booking) {
			throw new BadRequestException('Booking not found');
		}

		const amount = Number(booking.price ?? 0);
		if (!Number.isFinite(amount) || amount <= 0) {
			throw new BadRequestException('Booking amount is invalid for payment');
		}

		const merchantId = this.config.get<string>('PAYFAST_MERCHANT_ID', '').trim();
		const merchantKey = this.config.get<string>('PAYFAST_MERCHANT_KEY', '').trim();
		if (!merchantId || !merchantKey) {
			throw new BadRequestException('PayFast merchant credentials are not configured');
		}

		const sandboxEnabled = this.config.get<string>('PAYFAST_SANDBOX', 'true') !== 'false';
		const processUrl = sandboxEnabled
			? 'https://sandbox.payfast.co.za/eng/process'
			: 'https://www.payfast.co.za/eng/process';

		const frontendBase = this.config
			.get<string>('FRONTEND_BASE_URL', 'http://localhost:3000')
			.replace(/\/$/, '');
		const apiPublicBase = this.config
			.get<string>('API_PUBLIC_BASE_URL', 'http://localhost:3001')
			.replace(/\/$/, '');

		const returnUrl = this.config
			.get<string>('PAYFAST_RETURN_URL', `${frontendBase}/booking?payment=success`)
			.trim();
		const cancelUrl = this.config
			.get<string>('PAYFAST_CANCEL_URL', `${frontendBase}/booking?payment=cancelled`)
			.trim();
		const notifyUrl = this.config
			.get<string>('PAYFAST_NOTIFY_URL', `${apiPublicBase}/api/bookings/payfast/itn`)
			.trim();

		const firstName = (booking.contact_name || booking.customer_info || 'GO-GO Client').split(' ')[0];
		const itemName = `GO-GO Shuttle Booking ${booking.booking_id}`;
		const amountText = amount.toFixed(2);

		const fields: Record<string, string> = {
			merchant_id: merchantId,
			merchant_key: merchantKey,
			return_url: returnUrl,
			cancel_url: cancelUrl,
			notify_url: notifyUrl,
			name_first: firstName,
			email_address: booking.customer_info || 'noreply@gogoshuttles.local',
			m_payment_id: booking.booking_id || normalizedId,
			amount: amountText,
			item_name: itemName,
			custom_str1: String(booking.id),
		};

		fields.signature = this.generatePayfastSignature(fields);

		return {
			processUrl,
			formFields: fields,
			sandbox: sandboxEnabled,
			message: 'Post these fields to PayFast to start payment',
		};
	}

	async processPayfastItn(payload: Record<string, unknown>, remoteAddress?: string | null) {
		if (!this.isPayfastEnabled()) {
			this.logger.warn('PayFast ITN ignored because PAYFAST_ENABLED is false');
			return { ok: true, ignored: true };
		}

		const body = this.normalizeItnPayload(payload);
		const bookingRef = body.m_payment_id;
		const bookingRowId = Number.parseInt(body.custom_str1 || '', 10);
		if (!bookingRef && !Number.isInteger(bookingRowId)) {
			this.logger.warn('PayFast ITN ignored: missing booking identifier');
			return { ok: true, ignored: true };
		}

		const booking = bookingRef
			? await this.bookings.findOne({ where: { booking_id: bookingRef } })
			: await this.bookings.findOne({ where: { id: bookingRowId } });
		if (!booking) {
			this.logger.warn(`PayFast ITN ignored: booking ${bookingRef || body.custom_str1} not found`);
			return { ok: true, ignored: true };
		}

		const bookingId = booking.booking_id || String(booking.id);

		if (!this.verifyPayfastSignature(body)) {
			this.logger.warn(`PayFast ITN rejected: invalid signature for booking ${bookingId}`);
			return { ok: true, ignored: true };
		}

		const expectedAmount = Number(booking.price ?? 0);
		const paidAmount = Number(body.amount_gross || body.amount || 0);
		if (!Number.isFinite(expectedAmount) || !Number.isFinite(paidAmount) || Math.abs(expectedAmount - paidAmount) > 0.01) {
			this.logger.warn(
				`PayFast ITN rejected: amount mismatch for booking ${bookingId}. Expected ${expectedAmount}, got ${paidAmount}`
			);
			return { ok: true, ignored: true };
		}

		const validatedWithPayfast = await this.validateItnWithPayfast(body);
		if (!validatedWithPayfast) {
			this.logger.warn(`PayFast ITN rejected by gateway validation for booking ${bookingId}`);
			return { ok: true, ignored: true };
		}

		const rawStatus = (body.payment_status || '').toUpperCase();
		let mappedStatus = 'PENDING';
		if (rawStatus === 'COMPLETE') {
			mappedStatus = 'PAID';
		} else if (rawStatus === 'FAILED') {
			mappedStatus = 'FAILED';
		} else if (rawStatus === 'CANCELLED') {
			mappedStatus = 'CANCELLED';
		}

		await this.bookings.update(
			{ id: booking.id },
			{
				payment_status: mappedStatus,
				booking_status: mappedStatus === 'PAID' ? 'CONFIRM' : booking.booking_status,
				last_updated: this.formatTimestamp(new Date()),
			}
		);

		this.logger.log(
			`PayFast ITN accepted for booking ${bookingId}: ${mappedStatus} from ${remoteAddress || 'unknown-ip'}`
		);

		if (mappedStatus === 'PAID') {
			await this.sendPaymentReceipt(booking, bookingId, paidAmount, body.pf_payment_id);
		}

		return { ok: true, status: mappedStatus };
	}

	private resolveStatus(now: Date, bookingDate: string) {
		const today = this.formatDate(now);
		if (bookingDate === today) {
			return 'EMERGENCY';
		}

		const cutoff = new Date(now);
		cutoff.setHours(15, 0, 0, 0);
		if (now.getTime() >= cutoff.getTime()) {
			return 'PENDING';
		}

		return 'CONFIRM';
	}

	private isPayfastEnabled() {
		return this.config.get<string>('PAYFAST_ENABLED', 'false').toLowerCase() === 'true';
	}

	private async sendPaymentReceipt(
		booking: BookingEntity,
		bookingId: string,
		paidAmount: number,
		paymentId?: string
	) {
		const mode = (this.config.get<string>('CONTACT_EMAIL_MODE') ?? 'log').toLowerCase();
		if (mode !== 'smtp') {
			this.logger.log(`Receipt email skipped in ${mode} mode for ${bookingId}`);
			return;
		}

		const customerEmail = booking.customer_info;
		if (!customerEmail) {
			this.logger.warn(`Receipt email skipped: no customer email on file for booking ${bookingId}`);
			return;
		}

		try {
			const receiptInput = {
				bookingId,
				contactName: booking.contact_name ?? undefined,
				customerEmail,
				routeStart: booking.route_start ?? '',
				routeEnd: booking.route_end ?? '',
				bookingDate: booking.booking_date ?? '',
				bookingTime: booking.booking_time ?? '',
				busCapacity: booking.bus_capacity ?? '',
				amountPaid: paidAmount.toFixed(2),
				paymentDate: this.formatTimestamp(new Date()),
				paymentId,
				paymentStatus: 'PAID',
			};

			const receiptHtml = await this.emailTemplates.buildPaymentReceiptPdfHtml(receiptInput);
			const receiptPdf = await this.pdfGeneration.renderHtmlToPdf(receiptHtml);
			const receiptEmail = await this.emailTemplates.buildPaymentReceiptEmail(receiptInput);

			await this.mailService.sendDualEmail({
				ackTo: customerEmail,
				replyTo: customerEmail,
				ack: receiptEmail,
				notify: receiptEmail,
				failMessage: 'Unable to send payment receipt email',
				ackAttachments: [
					{
						filename: `GoGo-Receipt-${bookingId}.pdf`,
						content: receiptPdf,
						contentType: 'application/pdf',
					},
				],
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`Receipt email send failed for ${bookingId}: ${message}`);
		}
	}

	private formatDate(value: Date) {
		if (Number.isNaN(value.getTime())) {
			return '';
		}
		return value.toISOString().slice(0, 10);
	}

	private formatTimestamp(value: Date) {
		const yyyy = value.getFullYear();
		const mm = String(value.getMonth() + 1).padStart(2, '0');
		const dd = String(value.getDate()).padStart(2, '0');
		const hh = String(value.getHours()).padStart(2, '0');
		const mi = String(value.getMinutes()).padStart(2, '0');
		const ss = String(value.getSeconds()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
	}

	private formatJohannesburgTimestamp(value: Date) {
		const dateParts = new Intl.DateTimeFormat('en-CA', {
			timeZone: 'Africa/Johannesburg',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		}).formatToParts(value);

		const lookup = Object.fromEntries(
			dateParts
				.filter((part) => part.type !== 'literal')
				.map((part) => [part.type, part.value])
		);

		return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute}:${lookup.second}`;
	}

	private async savePurchaseOrder(file: UploadFile) {
		const root = process.cwd();
		const uploadDir = join(root, 'uploads', 'purchase_order');
		await mkdir(uploadDir, { recursive: true });

		const safeName = basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
		const ext = extname(safeName).toLowerCase();
		const allowedExt = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']);
		if (!allowedExt.has(ext)) {
			throw new BadRequestException('Unsupported purchase order file extension');
		}

		const filename = `${Date.now()}_${safeName}`;
		const outputPath = join(uploadDir, filename);
		await writeFile(outputPath, file.buffer);
		return `/uploads/purchase_order/${filename}`;
	}

	private normalizeItnPayload(payload: Record<string, unknown>) {
		const entries = Object.entries(payload || {}).map(([key, value]) => [
			key,
			this.normalizeScalarValue(value),
		]);

		return Object.fromEntries(entries) as Record<string, string>;
	}

	private generatePayfastSignature(fields: Record<string, string>) {
		const passphrase = this.config.get<string>('PAYFAST_PASSPHRASE', '').trim();
		const keys = Object.keys(fields)
			.filter((key) => key !== 'signature' && fields[key] !== undefined && fields[key] !== null && fields[key] !== '')
			.sort((left, right) => left.localeCompare(right));

		const parameterString = keys
			.map((key) => `${key}=${encodeURIComponent(fields[key]).replace(/%20/g, '+')}`)
			.join('&');

		const signatureBase = passphrase
			? `${parameterString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
			: parameterString;

		return this.md5(signatureBase);
	}

	private verifyPayfastSignature(fields: Record<string, string>) {
		const signature = (fields.signature || '').trim();
		if (!signature) {
			return false;
		}

		const expected = this.generatePayfastSignature(fields);
		return expected.toLowerCase() === signature.toLowerCase();
	}

	private async validateItnWithPayfast(fields: Record<string, string>) {
		if (this.config.get<string>('PAYFAST_VALIDATE_ITN', 'true') === 'false') {
			return true;
		}

		const sandboxEnabled = this.config.get<string>('PAYFAST_SANDBOX', 'true') !== 'false';
		const validateUrl = sandboxEnabled
			? 'https://sandbox.payfast.co.za/eng/query/validate'
			: 'https://www.payfast.co.za/eng/query/validate';

		const formBody = new URLSearchParams(fields).toString();
		try {
			const response = await fetch(validateUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: formBody,
			});

			const text = (await response.text()).trim().toUpperCase();
			return text === 'VALID';
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`PayFast ITN validation request failed: ${message}`);
			return false;
		}
	}

	private md5(value: string) {
		// PayFast signature specification requires MD5 hashing for request/ITN verification.
		return createHash('md5').update(value).digest('hex'); // NOSONAR
	}

	private normalizeScalarValue(value: unknown) {
		if (Array.isArray(value)) {
			return this.normalizeScalarValue(value[0]);
		}

		if (value === undefined || value === null) {
			return '';
		}

		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}

		return '';
	}

	private async sendBookingViaSmtp(input: {
		bookingId: string;
		status: string;
		routeStart: string;
		routeEnd: string;
		bookingDate: string;
		bookingTime: string;
		busCapacity: string;
		price: string;
		customerEmail: string;
		contactName?: string;
		contactPhone?: string;
		purchaseOrder?: string;
	}) {
		const mode = (this.config.get<string>('CONTACT_EMAIL_MODE') ?? 'log').toLowerCase();
		if (mode !== 'smtp') {
			this.logger.log(`Booking email skipped in ${mode} mode for ${input.bookingId}`);
			return;
		}

		try {
			const ack = await this.emailTemplates.buildBookingAcknowledgement(input);
			const notify = await this.emailTemplates.buildBookingNotification(input);

			await this.mailService.sendDualEmail({
				ackTo: input.customerEmail,
				replyTo: input.customerEmail,
				ack,
				notify,
				failMessage: 'Unable to send booking confirmation email',
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`Booking email send failed for ${input.bookingId}: ${message}`);
		}
	}
}
