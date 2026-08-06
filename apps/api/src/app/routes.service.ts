import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceEntity } from './entities/price.entity';
import { RouteEntity } from './entities/route.entity';

@Injectable()
export class RoutesService {
	constructor(
		@InjectRepository(RouteEntity)
		private readonly routes: Repository<RouteEntity>,
		@InjectRepository(PriceEntity)
		private readonly prices: Repository<PriceEntity>
	) {}

	async listRoutes() {
		return this.routes.find({ order: { id: 'ASC' } });
	}

	async getPricing(routeId: string, capacity: string) {
		const rid = Number(routeId);
		if (!Number.isInteger(rid) || rid <= 0 || !capacity) {
			return { error: '1', msg: 'Invalid routeId or capacity' };
		}

		const price = await this.prices.findOne({
			where: [
				{ route_id: rid, shuttle_capacity: capacity },
				{ rout_id: rid, shuttle_capacity: capacity },
			],
			order: { id: 'DESC' },
		});

		if (!price) {
			return {
				error: '1',
				msg: `No bus with capacity ${capacity} available for this route.`,
			};
		}

		return {
			error: '0',
			msg: '',
			price: Number(price.round_price ?? price.price ?? 0),
		};
	}

	async listCapacities(routeId: string) {
		const rid = Number(routeId);
		if (!Number.isInteger(rid) || rid <= 0) {
			return {
				type: 'error',
				msg: 'Invalid routeId',
				capacities: [],
			};
		}

		const rows = await this.prices.find({
			where: [{ route_id: rid }, { rout_id: rid }],
			order: { id: 'ASC' },
		});

		const capacities = Array.from(
			new Set(
				rows
					.filter((row) => Number(row.round_price ?? 0) > 0)
					.map((row) => (row.shuttle_capacity ?? '').trim())
					.filter(Boolean)
			)
		);

		if (!capacities.length) {
			return {
				type: 'error',
				msg: 'No shuttle available in this route.',
				capacities: [],
			};
		}

		return {
			type: 'success',
			capacities,
		};
	}
}
