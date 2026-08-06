import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceEntity } from './entities/price.entity';
import { RouteEntity } from './entities/route.entity';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
	imports: [TypeOrmModule.forFeature([RouteEntity, PriceEntity])],
	controllers: [RoutesController],
	providers: [RoutesService],
})
export class RoutesModule {}
