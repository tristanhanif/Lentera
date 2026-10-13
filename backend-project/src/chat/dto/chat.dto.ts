import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  text!: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @IsOptional()
  @IsUUID()
  storyId?: string;

  @IsOptional()
  @IsString()
  storyMediaUrl?: string;

  @IsOptional()
  @IsString()
  storyMediaType?: string;

  @IsOptional()
  @IsString()
  storyOwnerUsername?: string;

  @IsOptional()
  @IsUUID()
  noteId?: string;

  @IsOptional()
  @IsString()
  noteText?: string;

  @IsOptional()
  @IsString()
  noteType?: string;

  @IsOptional()
  @IsString()
  noteMusicTitle?: string;

  @IsOptional()
  @IsString()
  noteMusicArtist?: string;

  @IsOptional()
  @IsString()
  noteOwnerUsername?: string;

  @IsOptional()
  @IsString()
  noteOwnerAvatar?: string;

  @IsOptional()
  @IsString()
  noteExpiresAt?: string;

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsString()
  postMediaUrl?: string;

  @IsOptional()
  @IsString()
  postMediaType?: string;

  @IsOptional()
  @IsString()
  postOwnerUsername?: string;

  @IsOptional()
  @IsString()
  postOwnerAvatar?: string;

  @IsOptional()
  @IsString()
  postContent?: string;

  @IsOptional()
  @IsNumber()
  postMediaCount?: number;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  fileType?: string;
}

export class CreateConversationDto {
  @IsNotEmpty()
  @IsUUID()
  userId!: string;
}

export class PinMessageDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  durationInMinutes!: number;
}
