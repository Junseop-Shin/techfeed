import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * POST /events
   * Batch save user events. JWT is optional — authenticated users get user_id saved.
   * Max 100 events per request.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  async saveEvents(
    @Body() events: CreateEventDto[],
    @Request() req: AuthRequest,
  ): Promise<{ saved: number }> {
    if (!Array.isArray(events)) {
      throw new BadRequestException('Body must be an array of events');
    }
    if (events.length > 100) {
      throw new BadRequestException('Maximum 100 events per request');
    }

    const userId = req.user?.userId;
    await this.eventsService.saveEvents(events, userId);
    return { saved: events.length };
  }

  /**
   * GET /events/trends
   * Returns tag trends, hourly read patterns, and top contents.
   */
  @Get('trends')
  async getTrends(): Promise<{
    tagTrends: { tag: string; count: number }[];
    hourlyReads: { hour: number; count: number }[];
    topContents: { content_id: string; count: number }[];
  }> {
    const [tagTrends, hourlyReads, topContents] = await Promise.all([
      this.eventsService.getTagTrends(),
      this.eventsService.getHourlyReads(),
      this.eventsService.getTopContents(),
    ]);

    return { tagTrends, hourlyReads, topContents };
  }
}
