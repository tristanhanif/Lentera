import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user1Id' })
  user1: User;

  @Column()
  user1Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user2Id' })
  user2: User;

  @Column()
  user2Id: string;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @Column({ nullable: true })
  lastMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  // Clear chat per-user (hapus hanya untuk saya):
  // menyimpan waktu terakhir user menekan "Clear chat".
  // Pesan dengan createdAt <= waktu ini disembunyikan khusus untuk user tsb,
  // lawan bicara tidak ikut terpengaruh.
  @Column({ type: 'datetime', nullable: true })
  user1ClearedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  user2ClearedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
