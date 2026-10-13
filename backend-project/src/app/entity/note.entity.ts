import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

// Catatan ala IG Notes: 1 catatan aktif per user, kedaluwarsa otomatis.
// type 'text' = catatan tulisan, 'music' = catatan musik (judul + artist + opsional cover/url).
// Tahap 1: tampil di /messages sisi kiri. Tahap 2: cara mengisi + musik player.
@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  text: string;

  @Column({ type: 'enum', enum: ['text', 'music'], default: 'text' })
  type: 'text' | 'music';

  @Column({ type: 'varchar', length: 255, nullable: true })
  musicTitle: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  musicArtist: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  musicCover: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  musicUrl: string | null;

  // Audiens catatan: mutual = pengikut yang Anda ikuti balik (default),
  // close = hanya teman dekat yang sudah dipilih di /akun/teman_dekat.
  @Column({ type: 'enum', enum: ['mutual', 'close'], default: 'mutual' })
  audience: 'mutual' | 'close';

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
