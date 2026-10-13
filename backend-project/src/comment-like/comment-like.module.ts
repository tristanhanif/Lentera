import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentLikeController } from './comment-like.controller';
import { CommentLikeService } from './comment-like.service';
import { CommentLike } from 'src/app/entity/comment-like.entity';
import { Comments } from 'src/app/entity/comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommentLike, Comments])],
  controllers: [CommentLikeController],
  providers: [CommentLikeService],
  exports: [CommentLikeService],
})
export class CommentLikeModule {}
