import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
  Get,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/middleware/jwt-auth.guard';
// import { RolesGuard } from './roles.guard';
// import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  //Register
  @Post('register')
  //   @Roles(['admin'])
  async register(
    @Body() body: { email: string; password: string; fullname: string },
  ) {
    return this.authService.registerUser(
      body.email,
      body.fullname,
      body.password,
    );
  }
  //Login
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  //refresh token
  @Post('refresh-token')
  async refreshToken(@Body() body: { userId: string; refreshToken: string }) {
    const newTokens = await this.authService.refreshAccessToken(
      body.userId,
      body.refreshToken,
    );
    if (!newTokens) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return newTokens;
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: { user: { id: string } }) {
    console.log('user request', req.user.id);
    return this.authService.logout(req.user.id);
  }
}
