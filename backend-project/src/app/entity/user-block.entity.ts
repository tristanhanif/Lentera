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

// Relasi blokir satu arah: blocker tidak bisa melihat & tidak bisa dilihat oleh blocked.
// Efek dua arah karena semua query menyembunyikan kedua sisi (lihat BlocksService.getBlockedIds).
@Entity('user_blocks')
@Unique(['blockerId', 'blockedId'])
@Index(['blockerId'])
@Index(['blockedId'])
export class UserBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  blockerId: string;

  @Column({ type: 'uuid' })
  blockedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockerId' })
  blocker: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockedId' })
  blocked: User;

  @CreateDateColumn()
  createdAt: Date;
}
