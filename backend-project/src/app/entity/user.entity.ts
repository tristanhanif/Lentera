import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Posts } from './posts.entity';
import { Likes } from './like.entity';
import { Comments } from './comment.entity';
import { CommentLike } from './comment-like.entity';
import { Notification } from './notification.entity';
import { Follow } from './follow.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password: string | null;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  cover: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  website: string;

  @Column({ default: 'form' })
  provider: string;

  // Tampilkan saran akun di profil (toggle di /profile/edit, default nyala).
  // Kalau mati, akun ini juga tidak disarankan ke profil lain.
  @Column({ default: true })
  showSuggestion: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true, select: false })
  emailVerificationToken: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  resetPasswordToken: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  resetPasswordExpires: Date | null;

  @OneToMany(() => Posts, (post) => post.user)
  posts: Posts[];

  @OneToMany(() => Likes, (like) => like.user)
  likes: Likes[];

  @OneToMany(() => Comments, (comment) => comment.user)
  comments: Comments[];

  @OneToMany(() => CommentLike, (like) => like.user)
  commentLikes: CommentLike[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => Follow, (follow) => follow.follower)
  followers: Follow[];

  @OneToMany(() => Follow, (follow) => follow.following)
  following: Follow[];

  @OneToMany(() => Conversation, (conversation) => conversation.user1)
  conversationsAsUser1: Conversation[];

  @OneToMany(() => Conversation, (conversation) => conversation.user2)
  conversationsAsUser2: Conversation[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages: Message[];

  @Column({ nullable: true, select: false })
  refreshToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
