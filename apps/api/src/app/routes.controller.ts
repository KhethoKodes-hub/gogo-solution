import { Controller, Get, Param, Query } from '@nestjs/common';
import { RoutesService } from './routes.service';

@Controller('routes')
export class RoutesController {
	constructor(private readonly routesService: RoutesService) {}

	@Get()
	listRoutes() {
		return this.routesService.listRoutes();
	}

	@Get('pricing')
	getPricing(
		@Query('routeId') routeId: string,
		@Query('capacity') capacity: string
	) {
		return this.routesService.getPricing(routeId, capacity);
	}

	@Get(':routeId/capacities')
	listCapacities(@Param('routeId') routeId: string) {
		return this.routesService.listCapacities(routeId);
	}
}
