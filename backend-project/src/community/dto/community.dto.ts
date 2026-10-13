import { IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCommunityDto {
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

export class UpdateCommunityDto {
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

export class SendCommunityMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}

export class AddCommunityMembersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];
}

export class PromoteCommunityAdminDto {
  @IsUUID('4')
  userId: string;
}
