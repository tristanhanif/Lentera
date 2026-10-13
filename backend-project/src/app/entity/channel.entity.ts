import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  // Pembuat = satu-satunya yang bisa mengirim pesan.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @OneToMany(() => ChannelFollow, (f) => f.channel)
  follows: ChannelFollow[];

  @OneToMany(() => ChannelMessage, (m) => m.channel)
  messages: ChannelMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('channel_follows')
@Unique(['channelId', 'userId'])
export class ChannelFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Channel, (c) => c.follows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: Channel;

  @Column()
  channelId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  // Terakhir dibaca (konsep ala WA, sama seperti komunitas).
  @Column({ type: 'datetime', nullable: true })
  lastReadAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('channel_messages')
export class ChannelMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Channel, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: Channel;

  @Column()
  channelId: string;

  // Selalu pemilik (satu-satunya pengirim di saluran).
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  sender: User | null;

  @Column({ nullable: true })
  senderId: string | null;

  // Teks ATAU VN (salah satu wajib ada).
  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ type: 'text', nullable: true })
  audioUrl: string | null;

  // Durasi VN dalam detik.
  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
