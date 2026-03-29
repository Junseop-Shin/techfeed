import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';

export type EventType =
  | 'read' | 'click' | 'bookmark' | 'share' | 'like'
  | 'login' | 'signup' | 'push_enable' | 'push_disable'
  | 'review' | 'tab_visit' | 'search' | 'filter_apply'
  | 'app_open' | 'login_prompt_seen';

export class CreateEventDto {
  @IsEnum([
    'read', 'click', 'bookmark', 'share', 'like',
    'login', 'signup', 'push_enable', 'push_disable',
    'review', 'tab_visit', 'search', 'filter_apply',
    'app_open', 'login_prompt_seen',
  ])
  event_type: EventType;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  content_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  device_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  tag?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  duration_ms?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
