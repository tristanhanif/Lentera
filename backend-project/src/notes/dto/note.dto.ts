import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateNoteDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(60)
  text!: string;

  @IsOptional()
  @IsIn(['text', 'music'])
  type?: 'text' | 'music';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  musicTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  musicArtist?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  musicCover?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  musicUrl?: string;

  @IsOptional()
  @IsIn(['mutual', 'close'])
  audience?: 'mutual' | 'close';
}

export class ReplyNoteDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  text!: string;
}
