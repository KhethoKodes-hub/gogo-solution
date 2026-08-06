import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { M2mTokenDto } from './dto/m2m-token.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('register')
	register(@Body() input: RegisterDto) {
		return this.authService.register(input);
	}

	@Post('login')
	login(@Body() input: LoginDto) {
		return this.authService.login(input);
	}

	@Post('m2m/token')
	m2mToken(@Body() input: M2mTokenDto) {
		return this.authService.issueM2mToken(input);
	}
}
