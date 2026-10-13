import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/comment.dto';
import { AtGuard } from 'src/common/guards/at.guard';

@UseGuards(AtGuard)
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post('bikin')
  async createComment(@Body() createCommentDto: CreateCommentDto) {
    return this.commentService.createComment(createCommentDto);
  }

  @Get('post/:postId')
  async getCommentsByPost(@Param('postId') postId: string) {
    return this.commentService.getCommentsByPost(postId);
  }
}
