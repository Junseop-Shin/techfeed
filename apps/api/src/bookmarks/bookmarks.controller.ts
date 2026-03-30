import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddBookmarkDto } from './add-bookmark.dto';
import { UpdateBookmarkStatusDto } from './update-bookmark-status.dto';

@Controller('users/me/bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  async findAll(
    @Request() req: { user: { userId: string } },
    @Query('content_type') contentType?: string,
  ) {
    return this.bookmarksService.findByUserId(req.user.userId, contentType);
  }

  @Post(':contentId')
  async add(
    @Request() req: { user: { userId: string; isPremium?: boolean } },
    @Param('contentId') contentId: string,
    @Body() body: AddBookmarkDto,
  ) {
    await this.bookmarksService.add(req.user.userId, req.user.isPremium ?? false, contentId, body.content_type, body.status);
    return { success: true };
  }

  @Patch(':contentId/status')
  async updateStatus(
    @Request() req: { user: { userId: string } },
    @Param('contentId') contentId: string,
    @Body() body: UpdateBookmarkStatusDto,
  ) {
    await this.bookmarksService.updateStatus(req.user.userId, contentId, body.status);
    return { success: true };
  }

  @Patch(':contentId/job-status')
  async updateJobStatus(
    @Request() req: { user: { userId: string } },
    @Param('contentId') contentId: string,
    @Body() body: UpdateBookmarkStatusDto,
  ) {
    await this.bookmarksService.updateJobStatus(req.user.userId, contentId, body.status);
    return { success: true };
  }

  @Delete(':contentId')
  async remove(
    @Request() req: { user: { userId: string } },
    @Param('contentId') contentId: string,
  ) {
    await this.bookmarksService.remove(req.user.userId, contentId);
    return { success: true };
  }
}
