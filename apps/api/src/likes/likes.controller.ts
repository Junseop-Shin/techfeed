import { Controller, Post, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LikesService } from './likes.service';

@Controller('contents/:contentId/like')
@UseGuards(JwtAuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  async toggle(
    @Param('contentId') contentId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.likesService.toggle(req.user.userId, contentId);
  }
}
