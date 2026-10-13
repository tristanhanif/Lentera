import { Column, Entity, ManyToOne, JoinColumn, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Posts } from './posts.entity';
import { Community } from './community.entity';

export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  MENTION = 'mention',
  COMMUNITY = 'community',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  actor: User;

  @ManyToOne(() => Posts, { nullable: true })
  @JoinColumn()
  post: Posts;

  // Notifikasi komunitas (ditambahkan ke komunitas):
  // kanan notif tampil pp avatar komunitas, klik buka komunitasnya.
  @ManyToOne(() => Community, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn()
  community: Community | null;

  @CreateDateColumn()
  createdAt: Date;
}
