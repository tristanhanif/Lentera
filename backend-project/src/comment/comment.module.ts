import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Posts } from 'src/app/entity/posts.entity';
import { Comments } from 'src/app/entity/comment.entity';
import { CommentLike } from 'src/app/entity/comment-like.entity';
import { User } from 'src/app/entity/user.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { BlocksModule } from 'src/blocks/blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Posts, Comments, CommentLike, User]),
    NotificationModule,
    BlocksModule,
  ],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
