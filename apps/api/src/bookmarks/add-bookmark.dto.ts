import { IsIn, IsOptional, IsString } from 'class-validator';

export class AddBookmarkDto {
  @IsOptional()
  @IsString()
  @IsIn(['blog', 'youtube', 'job'])
  content_type?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
