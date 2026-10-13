import { IsOptional } from 'class-validator';
 
// post-query.dto.ts
export class ListQueryDto {
  @IsOptional()
  page = 1;
 
  @IsOptional()
  limit = 10;
 
  @IsOptional()
  search = "";

  // Urutan feed: "newest" = terbaru dulu, selain itu acak (default).
  @IsOptional()
  sort?: string;
}