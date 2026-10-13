import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommentLikeService } from './comment-like.service';
import { CommentLikeDto } from './dto/comment-like.dto';
import { AtGuard } from 'src/common/guards/at.guard';

@UseGuards(AtGuard)
@Controller('comment-like')
export class CommentLikeController {
  constructor(private readonly commentLikeService: CommentLikeService) {}

  @Post('toggle')
  async toggleLike(@Body() dto: CommentLikeDto) {
    return this.commentLikeService.toggleLike(dto.commentId);
  }

  @Get('status/:commentId')
  async getLikeStatus(@Param('commentId') commentId: string) {
    return this.commentLikeService.getLikeStatus(commentId);
  }
}
