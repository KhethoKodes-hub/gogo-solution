import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from './entities/booking.entity';
import { PriceEntity } from './entities/price.entity';
import { RouteEntity } from './entities/route.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { EmailModule } from './email/email.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
	imports: [TypeOrmModule.forFeature([BookingEntity, RouteEntity, PriceEntity]), EmailModule, PdfModule],
	controllers: [BookingsController],
	providers: [BookingsService],
})
export class BookingsModule {}
