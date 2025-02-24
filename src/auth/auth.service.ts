/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/database/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

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

  async registerUser(email: string, fullname: string, password: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (existingUser) throw new Error('User already exists');
    const hashedPassword = await this.hashPassword(password);
    const verifyToken = Math.random().toString(36).substring(2, 15); // 🔹 Generate token
    await this.prismaService.user.create({
      data: {
        email: email,
        fullname: fullname,
        password: hashedPassword,
        role: 'user',
        verifyToken: verifyToken,
      },
    });
    await this.sendVerificationEmail(email, verifyToken);
    return { message: 'User successfully created' };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    return user;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
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

  // Refresh Access Token - Issues a new pair of access & refresh tokens

  async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const isValid = await this.validateRefreshToken(userId, refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newAccessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = this.generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await this.updateRefreshToken(user.id, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
  async logout(userId: string): Promise<{ message: string }> {
    console.log({ userId });
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'User logout successfully' };
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    // Explicitly define `transporter` type as `Transporter`
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const transporter: Transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail email
        pass: process.env.EMAIL_PASSWORD, // Your Gmail app password (not normal password)
      },
    });

    const verifyUrl = `http://localhost:3000/auth/verify-email?token=${token}`;

    // Explicitly define the return type of `.sendMail()`
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email',
      html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prismaService.user.findFirst({
      where: { verifyToken: token },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { isVerified: true, verifyToken: null }, // ✅ Mark email as verified
    });

    return { message: 'Email verified successfully' };
  }
}
