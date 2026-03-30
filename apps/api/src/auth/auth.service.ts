import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private buildAuthResponse(user: { id: string; email: string; name?: string; is_premium?: boolean }) {
    const token = this.jwtService.sign({ sub: user.id, email: user.email, is_premium: user.is_premium ?? false });
    return {
      access_token: token,
      user: { id: user.id, email: user.email, name: user.name ?? '' },
    };
  }

  async signup(dto: SignupDto) {
    if (!dto.agreed_terms) {
      throw new BadRequestException('Terms agreement is required');
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.email, hashed, dto.name, true);

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Please use social login for this account');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async googleLogin(accessToken: string): Promise<{ access_token: string; user: { id: string; email: string; name: string } }> {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`,
    );

    if (!res.ok) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const info = (await res.json()) as GoogleUserInfo;
    const user = await this.usersService.findOrCreateGoogleUser(
      info.id,
      info.email,
      info.name,
    );

    return this.buildAuthResponse({ ...user, name: user.name ?? info.name });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Always return same response to prevent email enumeration
    const response = { message: 'If this email is registered, a reset link has been sent.' };

    if (!user || !user.password) return response;

    // Generate token and hash it
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.usersService.setResetToken(user.id, hashedToken, expires);

    // Send email via Resend — include full token so user can submit it
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'TechFeed <noreply@techfeed.nuclearbomb6518.com>',
            to: [email],
            subject: 'TechFeed 비밀번호 재설정',
            html: `
              <h2>비밀번호 재설정</h2>
              <p>아래 코드를 앱에 입력하여 비밀번호를 재설정하세요.</p>
              <p style="font-size:24px;font-weight:bold;background:#f3f4f6;padding:16px;border-radius:8px;text-align:center;letter-spacing:2px;">
                ${rawToken}
              </p>
              <p style="color:#6b7280;font-size:13px;">이 코드는 1시간 동안 유효합니다.</p>
              <p style="color:#6b7280;font-size:13px;">본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
            `,
          }),
        });
      } catch (err) {
        this.logger.warn(`Failed to send reset email: ${err}`);
        // Clear token on send failure
        await this.usersService.clearResetToken(user.id);
      }
    }

    return response;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Hash the incoming token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByResetToken(hashedToken);

    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hashed);
    await this.usersService.clearResetToken(user.id);

    return { message: 'Password has been reset successfully' };
  }
}
