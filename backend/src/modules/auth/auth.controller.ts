import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Tenant } from './decorators/tenant.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  async login(@Request() req, @Tenant() tenantId: string) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(
    @Body() data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    },
    @Tenant() tenantId: string,
  ) {
    // Register new user (default role: PARENT)
    // Implementation depends on registration flow
    throw new Error('Registration endpoint not yet implemented');
  }
}
