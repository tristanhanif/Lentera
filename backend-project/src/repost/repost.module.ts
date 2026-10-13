import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepostController } from './repost.controller';
import { RepostService } from './repost.service';
import { Reposts } from 'src/app/entity/repost.entity';
import { Posts } from 'src/app/entity/posts.entity';
import { Follow } from 'src/app/entity/follow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reposts, Posts, Follow])],
  controllers: [RepostController],
  providers: [RepostService],
})
export class RepostModule {}
