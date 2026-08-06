import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	constructor(private readonly config: ConfigService) {
		super();
	}

	canActivate(context: ExecutionContext) {
		if (this.config.get<string>('AUTH_DISABLED', 'false') === 'true') {
			const request = context.switchToHttp().getRequest();
			request.user = {
				type: 'dev',
				sub: 1,
				email: 'dev-local@gogo.local',
				role: 'admin',
				clientId: 'dev-local-client',
			};
			return true;
		}

		return super.canActivate(context);
	}
}
