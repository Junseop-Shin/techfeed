import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { EventsService } from '../events/events.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    private readonly eventsService: EventsService,
  ) {}

  async create(userId: string, rating: number, body?: string): Promise<Review> {
    const review = this.reviewRepo.create({ user_id: userId, rating, body: body ?? null });
    const saved = await this.reviewRepo.save(review);

    // Forward to devops-monitor — triggers Slack alert on review event
    await this.eventsService.saveEvents(
      [{ event_type: 'review', metadata: { rating, body_preview: body?.slice(0, 100) } }],
      userId,
    );

    return saved;
  }

  findAll(): Promise<Review[]> {
    return this.reviewRepo.find({ order: { created_at: 'DESC' } });
  }
}
