import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaveController } from './save.controller';
import { SaveService } from './save.service';
import { SavedPost } from 'src/app/entity/saved-post.entity';
import { Posts } from 'src/app/entity/posts.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedPost, Posts])],
  controllers: [SaveController],
  providers: [SaveService],
})
export class SaveModule {}
