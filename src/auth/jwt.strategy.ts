import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserDto } from './user.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default_secret',
    });
  }

  /**
   * Validates the JWT payload and extracts user data.
   * This function should return the user object that will be attached to req.user.
   */
  validate(payload: UserDto) {
    return {
      userId: payload.sub, // `sub` usually refers to user ID in JWT payload
      email: payload.email,
      role: payload.role, // Add role if applicable
    };
  }
}
