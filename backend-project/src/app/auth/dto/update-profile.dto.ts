import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._]{3,30}$/, {
    message:
      'Username hanya boleh huruf, angka, titik (.) dan underscore (_), tanpa spasi, 3-30 karakter',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  cover?: string;

  @IsOptional()
  @IsBoolean()
  showSuggestion?: boolean;
}
