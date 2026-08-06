import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
    });
  }

  async validate(payload: {
    sub?: number;
    email?: string;
    role?: string;
    token_use?: string;
    client_id?: string;
    scope?: string;
  }) {
    if (payload.token_use === 'm2m' && payload.client_id) {
      return {
        type: 'client',
        clientId: payload.client_id,
        scope: payload.scope ?? '',
      };
    }

    const user = await this.authService.validateUserById(Number(payload.sub));
    // Reject tokens for users removed after token issuance.
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return { type: 'user', sub: user.id, email: user.email, role: user.role };
  }
}
