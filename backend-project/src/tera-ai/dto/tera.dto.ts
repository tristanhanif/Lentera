import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export interface TeraHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export class TeraChatDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsArray()
  history?: TeraHistoryItem[];
}
