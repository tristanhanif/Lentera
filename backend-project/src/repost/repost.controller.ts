import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RepostService } from './repost.service';
import { AtGuard } from 'src/common/guards/at.guard';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

class RepostDto {
  @IsNotEmpty()
  @IsUUID()
  postId!: string;
}

class PendapatDto {
  @IsNotEmpty()
  @IsUUID()
  postId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pendapat?: string | null;
}

@UseGuards(AtGuard)
@Controller('repost')
export class RepostController {
  constructor(private readonly repostService: RepostService) {}

  @Post('toggle')
  async toggleRepost(@Body() dto: RepostDto) {
    return this.repostService.toggleRepost(dto.postId);
  }

  @Patch('pendapat')
  async updatePendapat(@Body() dto: PendapatDto) {
    return this.repostService.updatePendapat(dto.postId, dto.pendapat ?? null);
  }

  @Get('status/:postId')
  async getRepostStatus(@Param('postId') postId: string) {
    return this.repostService.getRepostStatus(postId);
  }

  @Get('my-posts')
  async getMyReposts(@Query() query: { page?: number; limit?: number }) {
    return this.repostService.getMyReposts(query);
  }
}
