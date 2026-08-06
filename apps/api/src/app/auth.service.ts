import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { M2mTokenDto } from './dto/m2m-token.dto';
import { OAuthClientEntity } from './entities/oauth-client.entity';
import { UserEntity } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(UserEntity)
		private readonly users: Repository<UserEntity>,
		@InjectRepository(OAuthClientEntity)
		private readonly oauthClients: Repository<OAuthClientEntity>,
		private readonly jwtService: JwtService,
		private readonly config: ConfigService
	) {}

	async register(input: RegisterDto) {
		const existing = await this.users.findOne({ where: { email: input.email } });
		if (existing) {
			throw new UnauthorizedException('Email already registered');
		}

		const passwordHash = await hash(input.password, 10);
		const user = this.users.create({
			email: input.email,
			passwordHash,
			displayName: input.displayName,
			role: input.role ?? 'school',
			contactNumber: input.contactNumber ?? null,
			schoolId: input.schoolId ?? null,
		});
		const saved = await this.users.save(user);
		return this.issueTokens(saved);
	}

	async login(input: LoginDto) {
		const user = await this.users.findOne({ where: { email: input.email } });
		if (!user) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const valid = await compare(input.password, user.passwordHash);
		if (!valid) {
			throw new UnauthorizedException('Invalid credentials');
		}

		return this.issueTokens(user);
	}

	async validateUserById(id: number) {
		return this.users.findOne({ where: { id } });
	}

	async issueM2mToken(input: M2mTokenDto) {
		if (input.grant_type !== 'client_credentials') {
			throw new UnauthorizedException('Unsupported grant_type');
		}

		const client = await this.oauthClients.findOne({
			where: { clientId: input.client_id, isActive: true },
		});

		if (!client) {
			const devId = this.config.get<string>('M2M_DEV_CLIENT_ID');
			const devSecret = this.config.get<string>('M2M_DEV_CLIENT_SECRET');
			if (!devId || !devSecret || devId !== input.client_id || devSecret !== input.client_secret) {
				throw new UnauthorizedException('Invalid client credentials');
			}

			return this.signM2mToken(devId, this.parseScopes(this.config.get<string>('M2M_DEV_SCOPES', 'api.read api.write')), input.scope);
		}

		const validSecret = await compare(input.client_secret, client.clientSecretHash);
		if (!validSecret) {
			throw new UnauthorizedException('Invalid client credentials');
		}

		const allowed = this.parseScopes(client.allowedScopes);
		return this.signM2mToken(client.clientId, allowed, input.scope);
	}

	private issueTokens(user: UserEntity) {
		const payload = { sub: user.id, email: user.email, role: user.role };
		const accessTtl = this.config.get<string>('JWT_ACCESS_TTL', '15m');
		const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL', '7d');
		const accessToken = this.jwtService.sign(payload, {
			secret: this.config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
			expiresIn: accessTtl as any,
		});
		const refreshToken = this.jwtService.sign(payload, {
			secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
			expiresIn: refreshTtl as any,
		});

		return {
			accessToken,
			refreshToken,
			user: {
				id: user.id,
				email: user.email,
				displayName: user.displayName,
				role: user.role,
			},
		};
	}

	private signM2mToken(clientId: string, allowedScopes: string[], requestedScope?: string) {
		const requestedScopes = this.parseScopes(requestedScope ?? '');
		const grantedScopes = requestedScopes.length
			? requestedScopes.filter((scope) => allowedScopes.includes(scope))
			: allowedScopes;

		if (!grantedScopes.length) {
			throw new UnauthorizedException('No scopes granted for this client');
		}

		const payload = {
			token_use: 'm2m',
			client_id: clientId,
			scope: grantedScopes.join(' '),
		};

		const accessTtl = this.config.get<string>('JWT_ACCESS_TTL', '15m');
		const accessToken = this.jwtService.sign(payload, {
			secret: this.config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
			expiresIn: accessTtl as any,
		});

		const expiresInSeconds = this.durationToSeconds(accessTtl);
		return {
			access_token: accessToken,
			token_type: 'Bearer',
			expires_in: expiresInSeconds,
			scope: grantedScopes.join(' '),
		};
	}

	private parseScopes(scopeText: string) {
		return scopeText
			.split(/\s+/)
			.map((scope) => scope.trim())
			.filter(Boolean);
	}

	private durationToSeconds(duration: string) {
		if (/^\d+$/.test(duration)) {
			return Number(duration);
		}

		const match = /^(\d+)([smhd])$/.exec(duration);
		if (!match) {
			return 900;
		}

		const count = Number(match[1]);
		switch (match[2]) {
			case 's':
				return count;
			case 'm':
				return count * 60;
			case 'h':
				return count * 3600;
			case 'd':
				return count * 86400;
			default:
				return 900;
		}
	}
}
