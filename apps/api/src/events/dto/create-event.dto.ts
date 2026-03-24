import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @IsEnum(['read', 'click', 'bookmark', 'share'])
  event_type: 'read' | 'click' | 'bookmark' | 'share';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  content_id: string;

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
