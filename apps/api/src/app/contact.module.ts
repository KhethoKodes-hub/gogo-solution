import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { EmailModule } from './email/email.module';
import { PdfModule } from './pdf/pdf.module';
import { PriceEntity } from './entities/price.entity';
import { RouteEntity } from './entities/route.entity';

@Module({
  imports: [EmailModule, PdfModule, TypeOrmModule.forFeature([RouteEntity, PriceEntity])],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
