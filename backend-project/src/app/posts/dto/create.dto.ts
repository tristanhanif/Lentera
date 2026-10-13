import {
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateMediaDto {
  //   @IsUrl({}, { message: 'Format URL tidak valid' })

  @IsOptional()
  url: string;

  @IsEnum(['image', 'video'], { message: 'Type harus image atau video' })
  @IsOptional()
  type: 'image' | 'video';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

class CreateMusicDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  cover?: string;
}

export class CreatePostDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMusicDto)
  music?: CreateMusicDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true }) // Validasi setiap objek di dalam array
  @Type(() => CreateMediaDto) // Mengubah plain object menjadi instance class
  medias: CreateMediaDto[];
}
