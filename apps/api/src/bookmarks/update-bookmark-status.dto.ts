import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateBookmarkStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}
