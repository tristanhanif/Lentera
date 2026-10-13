import {
  IsArray,
  IsEnum,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStoryMediaDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  publicId: string;

  @IsEnum(['image', 'video'], { message: 'Media type harus image atau video' })
  type: 'image' | 'video';
}

export class CreateStoryMusicDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  url: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  artist: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cover?: string;

  @IsOptional()
  @IsNumber({}, { message: 'music.start harus angka (detik mulai)' })
  @Min(0, { message: 'music.start minimal 0' })
  @Max(600, { message: 'music.start maksimal 600' })
  start?: number;

  @IsOptional()
  @IsIn(['none', 'lyrics', 'vinyl'], {
    message: 'music.mode harus none, lyrics, atau vinyl',
  })
  mode?: 'none' | 'lyrics' | 'vinyl';

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'music.lyrics maksimal 2000 karakter' })
  lyrics?: string;

  @IsOptional()
  @IsNumber({}, { message: 'music.x harus angka 0-100' })
  @Min(0)
  @Max(100)
  x?: number;

  @IsOptional()
  @IsNumber({}, { message: 'music.y harus angka 0-100' })
  @Min(0)
  @Max(100)
  y?: number;

  @IsOptional()
  @IsNumber({}, { message: 'music.scale harus angka 0.5-2' })
  @Min(0.5)
  @Max(2)
  scale?: number;
}

export class CreateStoryTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140, { message: 'Teks story maksimal 140 karakter' })
  content: string;

  @IsOptional()
  @IsIn(['modern', 'classic', 'typewriter', 'neon', 'poster'], {
    message: 'text.style harus modern, classic, typewriter, neon, atau poster',
  })
  style?: 'modern' | 'classic' | 'typewriter' | 'neon' | 'poster';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bg?: string;

  @IsOptional()
  @IsNumber({}, { message: 'text.x harus angka 0-100' })
  @Min(0)
  @Max(100)
  x?: number;

  @IsOptional()
  @IsNumber({}, { message: 'text.y harus angka 0-100' })
  @Min(0)
  @Max(100)
  y?: number;

  @IsOptional()
  @IsNumber({}, { message: 'text.scale harus angka 0.5-2' })
  @Min(0.5)
  @Max(2)
  scale?: number;
}

export class CreateStoryDto {
  @IsEnum(['photo', 'video'], { message: 'Type harus photo atau video' })
  type: 'photo' | 'video';

  @IsOptional()
  @IsIn(['single', 'split2', 'grid3', 'grid4'], {
    message: 'Layout harus single, split2, grid3, atau grid4',
  })
  layout?: 'single' | 'split2' | 'grid3' | 'grid4';

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Caption maksimal 500 karakter' })
  caption?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'unlockAt harus format ISO8601' })
  unlockAt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateStoryMusicDto)
  music?: CreateStoryMusicDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateStoryTextDto)
  text?: CreateStoryTextDto;

  // Bagikan postingan gambar ke story: snapshot + id untuk "Lihat Postingan".
  @IsOptional()
  @IsUUID('4', { message: 'postId harus UUID' })
  postId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  postOwnerUsername?: string;

  @IsOptional()
  @IsNumber({}, { message: 'postMediaCount harus angka' })
  @Min(1)
  @Max(10)
  postMediaCount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'postScale harus angka 0.5-2' })
  @Min(0.5)
  @Max(2)
  postScale?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal 1 media' })
  @ArrayMaxSize(4, { message: 'Maksimal 4 media' })
  @ValidateNested({ each: true })
  @Type(() => CreateStoryMediaDto)
  medias: CreateStoryMediaDto[];
}
