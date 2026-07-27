import { Controller, NotFoundException, Post, Request, UseGuards } from '@nestjs/common';
import { Body } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { PushService } from './push.service';

class SubscribeDto {
  @IsString()
  fcm_token: string;
}

@Controller('push')
export class PushController {
  constructor(
    private readonly pushService: PushService,
    private readonly usersService: UsersService,
  ) {}

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(
    @Request() req: { user: { userId: string } },
    @Body() dto: SubscribeDto,
  ) {
    await this.usersService.updateFcmToken(req.user.userId, dto.fcm_token);
    return { success: true };
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  async test(@Request() req: { user: { userId: string } }) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user?.fcm_token) {
      throw new NotFoundException('No FCM token registered for this user');
    }
    await this.pushService.send(
      user.fcm_token,
      'TechFeed 테스트',
      '푸시 알림이 정상적으로 동작합니다.',
    );
    return { success: true };
  }
}
