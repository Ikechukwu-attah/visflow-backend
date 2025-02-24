import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/database/prisma.service';

interface UserPayload {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  async comparePasswords(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  generateToken(user: UserPayload): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  generateRefreshToken(payload: UserPayload): string {
    return this.jwtService.sign(
      { sub: payload.id },

      { secret: process.env.REFRESH_TOKEN_SECRET || '', expiresIn: '7d' },
    );
  }

  verifyToken(token: string): any {
    return this.jwtService.verify(token);
  }

  async findUserByEmail(email: string) {
    return await this.prismaService.user.findUnique({
      where: { email: email },
    });
  }

  async createUser(email: string, fullname: string, password: string) {
    const hashedPassword = await this.hashPassword(password);
    await this.prismaService.user.create({
      data: {
        email: email,
        fullname: fullname,
        password: hashedPassword,
      },
    });
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashedToken,
      },
    });
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.refreshToken) return false;

    return await bcrypt.compare(token, user.refreshToken);
  }
}
