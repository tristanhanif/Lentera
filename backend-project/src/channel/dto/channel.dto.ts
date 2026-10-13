import { IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}

export class SendChannelTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}

export class SendChannelVoiceDto {
  @IsString()
  audioUrl: string;

  @IsInt()
  @Min(1)
  @Max(300)
  duration: number;
}
