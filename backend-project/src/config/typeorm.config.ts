import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Comments } from 'src/app/entity/comment.entity';
import { Reposts } from 'src/app/entity/repost.entity';
import { CommentLike } from 'src/app/entity/comment-like.entity';
import { Likes } from 'src/app/entity/like.entity';
import { Media } from 'src/app/entity/media.entity';
import { PasswordResetToken } from 'src/app/entity/password-reset-token.entity';
import { Posts } from 'src/app/entity/posts.entity';
import { User } from 'src/app/entity/user.entity';
import { Notification } from 'src/app/entity/notification.entity';
import { Follow } from 'src/app/entity/follow.entity';
import { Conversation } from 'src/app/entity/conversation.entity';
import { Message } from 'src/app/entity/message.entity';
import { SavedPost } from 'src/app/entity/saved-post.entity';
import { Story, StoryMedia, StoryView, StoryLike } from 'src/app/entity/story.entity';
import { Note } from 'src/app/entity/note.entity';
import { LoginSession } from 'src/app/entity/login-session.entity';
import { UserBlock } from 'src/app/entity/user-block.entity';
import { CloseFriend } from 'src/app/entity/close-friend.entity';
import { Community, CommunityMember, CommunityMessage } from 'src/app/entity/community.entity';
import { Channel, ChannelFollow, ChannelMessage, ChannelMessageReaction } from 'src/app/entity/channel.entity';
export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  // DB Docker jalan di UTC (SELECT NOW() = jam UTC), sedangkan Node jalan di WIB.
  // Tanpa ini, DATETIME "02:21" dibaca sebagai 02:21 WIB (geser -7 jam),
  // lalu dikirim ke frontend sebagai 19:21Z kemarin → tampil tetap 02.21.
  // 'Z' = baca/tulis selalu sebagai UTC, frontend tinggal konversi ke Asia/Jakarta.
  timezone: 'Z',
  // Aiven/host DB terkelola wajib TLS (ssl-mode=REQUIRED).
  // Aktif dengan DB_SSL=true; dev lokal membiarkan DB_SSL kosong (tanpa TLS).
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  entities: [User, PasswordResetToken, Posts, Media, Likes, Comments, CommentLike, Notification, Follow, Conversation, Message, Reposts, SavedPost, Story, StoryMedia, StoryView, StoryLike, Note, LoginSession, UserBlock, CloseFriend, Community, CommunityMember, CommunityMessage, Channel, ChannelFollow, ChannelMessage, ChannelMessageReaction],
  synchronize: true,
  // logging: true,
};
