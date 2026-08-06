import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Post,
	Req,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

type UploadFile = {
	size: number;
	mimetype: string;
	originalname: string;
	buffer: Buffer;
};

@Controller('bookings')
export class BookingsController {
	constructor(private readonly bookingsService: BookingsService) {}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	getMine(@Req() req: Request & { user?: { sub: number } }) {
		return this.bookingsService.listMine(req.user?.sub ?? 0);
	}

	@UseInterceptors(FileInterceptor('purchase_order'))
	@Post()
	createBooking(
		@Body() input: CreateBookingDto,
		@Req()
		req: Request & {
			user?: { type?: string; sub?: number; email?: string; clientId?: string };
		},
		@UploadedFile() file?: UploadFile
	) {
		if (file) {
			const maxBytes = 8 * 1024 * 1024;
			if (file.size > maxBytes) {
				throw new BadRequestException('Purchase order file exceeds 8MB limit');
			}

			const allowed = [
				'application/pdf',
				'image/jpeg',
				'image/png',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			];
			if (!allowed.includes(file.mimetype)) {
				throw new BadRequestException('Unsupported purchase order file type');
			}
		}

		return this.bookingsService.createBooking(input, req.user, file);
	}

	@Post(':bookingId/payfast/initiate')
	initiatePayfast(@Param('bookingId') bookingId: string) {
		return this.bookingsService.initiatePayfastPayment(bookingId);
	}

	@Post('payfast/itn')
	@HttpCode(200)
	async handlePayfastItn(
		@Body() payload: Record<string, unknown>,
		@Req() req: Request
	) {
		await this.bookingsService.processPayfastItn(payload, req.ip);
		return 'OK';
	}
}
