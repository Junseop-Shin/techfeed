import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { PushService } from './push.service';

class SubscribeDto {
  @IsString()
  fcm_token: string;
}

class TestPushDto {
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
  async test(@Body() dto: TestPushDto) {
    await this.pushService.send(
      dto.fcm_token,
      'TechFeed 테스트',
      '푸시 알림이 정상적으로 동작합니다.',
    );
    return { success: true };
  }
}
