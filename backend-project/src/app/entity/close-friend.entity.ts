import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Column,
  Index,
} from 'typeorm';
import { User } from './user.entity';

// Relasi teman dekat satu arah (POV pemilik akun):
// owner memilih friend sebagai teman dekat.
// friend menganggap owner biasa saja (tidak otomatis mutual).
// Hanya pengikut (followers) yang boleh dijadikan teman dekat.
@Entity('close_friends')
@Unique(['ownerId', 'friendId'])
@Index(['ownerId'])
@Index(['friendId'])
export class CloseFriend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'uuid' })
  friendId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'friendId' })
  friend: User;

  @CreateDateColumn()
  createdAt: Date;
}
