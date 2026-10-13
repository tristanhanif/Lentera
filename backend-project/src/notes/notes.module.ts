import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { NotesCleanupService } from './notes.cron';
import { Note } from '../app/entity/note.entity';
import { User } from '../app/entity/user.entity';
import { Follow } from '../app/entity/follow.entity';
import { CloseFriend } from '../app/entity/close-friend.entity';
import { ChatModule } from '../chat/chat.module';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Note, User, Follow, CloseFriend]), ChatModule, BlocksModule],
  controllers: [NotesController],
  providers: [NotesService, NotesCleanupService],
  exports: [NotesService],
})
export class NotesModule {}
