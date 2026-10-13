import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './app/auth/auth.module';
import { MailModule } from './app/mail/mail.module';
import { UploadController } from './app/upload/upload.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CloudinaryModule } from './app/cloudinary/cloudinary.module';
import { PostsModule } from './app/posts/posts.module';
import { CommentModule } from './comment/comment.module';
import { CommentLikeModule } from './comment-like/comment-like.module';
import { LikeModule } from './like/like.module';
import { NotificationModule } from './notification/notification.module';
import { FollowModule } from './follow/follow.module';
import { ChatModule } from './chat/chat.module';
import { RepostModule } from './repost/repost.module';
import { SaveModule } from './save/save.module';
import { StoriesModule } from './app/stories/stories.module';
import { SpotifyModule } from './app/spotify/spotify.module';
import { NotesModule } from './notes/notes.module';
import { CommunityModule } from './community/community.module';
import { ChannelModule } from './channel/channel.module';
// BlocksModule wajib diimpor SEBELUM FollowModule agar GET /users/blocks
// tidak tertangkap route GET /users/:id milik FollowController.
import { BlocksModule } from './blocks/blocks.module';
// CloseFriendsModule juga SEBELUM FollowModule agar GET /users/close-friends
// tidak tertangkap route GET /users/:id.
import { CloseFriendsModule } from './close-friends/close-friends.module';
import { TeraAiModule } from './tera-ai/tera-ai.module';

// Cleanup story expired (24 jam + hapus Cloudinary) jalan otomatis via cron tiap 10 menit.
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveStaticOptions: {
        setHeaders: (res, path) => {
          // khusus file video
          if (path.endsWith('.mp4')) {
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Accept-Ranges', 'bytes');
          }
        },
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const { typeOrmConfig } = await import('./config/typeorm.config.js');
        return typeOrmConfig;
      },
    }),
    AuthModule,
    MailModule,
    CloudinaryModule,
    PostsModule,
    CommentModule,
    CommentLikeModule,
    LikeModule,
    NotificationModule,
    BlocksModule,
    CloseFriendsModule,
    TeraAiModule,
    FollowModule,
    ChatModule,
    RepostModule,
    SaveModule,
    StoriesModule,
    SpotifyModule,
    NotesModule,
    CommunityModule,
    ChannelModule,
  ],
  controllers: [AppController, UploadController],
  providers: [AppService],
  exports: [],
})
export class AppModule {}

