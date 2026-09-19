import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { envs } from '../config';
import {
  LoginUserDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterUserDto,
} from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_ROUNDS = 10;
const DUMMY_HASH = `$2a$${BCRYPT_ROUNDS}$${'x'.repeat(53)}`;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterUserDto) {
    const user = await this.prisma.user
      .create({
        data: {
          email: dto.email.toLowerCase(),
          fullName: dto.fullName,
          passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
          role: 'user',
        },
      })
      .catch((error: unknown) => {
        if (this.isUniqueViolation(error)) {
          throw new RpcException({
            status: HttpStatus.CONFLICT,
            message: 'An account with that email already exists',
          });
        }
        throw error;
      });

    this.logger.log(`User registered: ${user.id}`);

    return this.buildSession(user);
  }

  async login(dto: LoginUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      throw this.invalidCredentials();
    }

    if (!user.active) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'This account is disabled',
      });
    }

    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw this.invalidCredentials();
    }

    return this.buildSession(user);
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw this.invalidRefreshToken();
    }

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}. All sessions revoked.`,
      );

      throw this.invalidRefreshToken();
    }

    if (stored.expiresAt <= new Date()) {
      throw this.invalidRefreshToken();
    }

    if (!stored.user.active) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'This account is disabled',
      });
    }

    const rotated = randomBytes(32).toString('hex');
    const expiresAt = this.refreshTokenExpiry();

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: this.hashToken(rotated),
          expiresAt,
        },
      }),
    ]);

    return {
      accessToken: await this.signAccessToken(stored.user),
      refreshToken: rotated,
    };
  }

  async logout(dto: LogoutDto) {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hashToken(dto.refreshToken),
        userId: dto.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.active) {
      throw new RpcException({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid credentials',
      });
    }

    return this.publicUser(user);
  }

  private async buildSession(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.issueRefreshToken(user.id),
    ]);

    return { user: this.publicUser(user), accessToken, refreshToken };
  }

  private signAccessToken(user: { id: string; email: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }

  private async issueRefreshToken(userId: string) {
    const token = randomBytes(32).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt: this.refreshTokenExpiry(),
      },
    });

    return token;
  }

  private refreshTokenExpiry() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + envs.jwtRefreshExpiresInDays);
    return expiresAt;
  }

  private publicUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private invalidCredentials() {
    return new RpcException({
      status: HttpStatus.UNAUTHORIZED,
      message: 'Invalid credentials',
    });
  }

  private invalidRefreshToken() {
    return new RpcException({
      status: HttpStatus.UNAUTHORIZED,
      message: 'Invalid or expired refresh token',
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
