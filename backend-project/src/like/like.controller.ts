import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { LikeDto } from './dto/like.dto';
import { AtGuard } from 'src/common/guards/at.guard';

@UseGuards(AtGuard)
@Controller('like')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post('toggle')
  async toggleLike(@Body() dto: LikeDto) {
    return this.likeService.toggleLike(dto.postId);
  }

  @Get('status/:postId')
  async getLikeStatus(@Param('postId') postId: string) {
    return this.likeService.getLikeStatus(postId);
  }

  @Get('post/:postId')
  async getPostLikes(@Param('postId') postId: string) {
    return this.likeService.getPostLikes(postId);
  }
}
