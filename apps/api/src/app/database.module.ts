import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from './entities/booking.entity';
import { OAuthClientEntity } from './entities/oauth-client.entity';
import { PointEntity } from './entities/point.entity';
import { PriceEntity } from './entities/price.entity';
import { RouteEntity } from './entities/route.entity';
import { ShuttleEntity } from './entities/shuttle.entity';
import { UserEntity } from './entities/user.entity';

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => {
				const socketPath = config.get<string>('DB_SOCKET_PATH');
				return {
					type: 'mariadb' as const,
					host: config.get<string>('DB_HOST', '127.0.0.1'),
					port: config.get<number>('DB_PORT', 3306),
					username: config.get<string>('DB_USER', 'gogo_app'),
					password: config.get<string>('DB_PASSWORD', 'gogo_app_pw'),
					database: config.get<string>('DB_NAME', 'gogo_shuttles_platform'),
					...(socketPath ? { socketPath } : {}),
					entities: [
						RouteEntity,
						PointEntity,
						ShuttleEntity,
						PriceEntity,
						BookingEntity,
						UserEntity,
						OAuthClientEntity,
					],
					synchronize: config.get<string>('DB_SYNC', 'false') === 'true',
					logging: config.get<string>('DB_LOGGING', 'false') === 'true',
				};
			},
		}),
	],
})
export class DatabaseModule {}
