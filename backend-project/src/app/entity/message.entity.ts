import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ default: false })
  isStarred: boolean;

  @Column({ default: false })
  isEvent: boolean;

  @Column({ type: 'datetime', nullable: true })
  pinnedUntil: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  senderId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  conversationId: string;

  @Column({ type: 'uuid', nullable: true })
  replyToId: string | null;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replyToId' })
  replyTo: Message | null;

  // Balasan story: pesan chat menyimpan cuplikan story yang dibalas
  // (ala IG: "Membalas cerita [username]" + preview media + teks).
  @Column({ type: 'uuid', nullable: true })
  storyId: string | null;

  @Column({ type: 'text', nullable: true })
  storyMediaUrl: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  storyMediaType: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  storyOwnerUsername: string | null;

  // Balasan catatan: snapshot catatan yang dibalas (ala IG Notes reply).
  // PP avatar di atasnya kotak catatan berisi catatan, di bawahnya kotak
  // pesan berisi balasan. Kalau catatan sudah kedaluwarsa -> tampilkan
  // "Catatan sudah tidak tersedia" (cek noteExpiresAt di frontend).
  @Column({ type: 'uuid', nullable: true })
  noteId: string | null;

  @Column({ type: 'text', nullable: true })
  noteText: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  noteType: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  noteMusicTitle: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  noteMusicArtist: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  noteOwnerUsername: string | null;

  @Column({ type: 'text', nullable: true })
  noteOwnerAvatar: string | null;

  @Column({ type: 'datetime', nullable: true })
  noteExpiresAt: Date | null;

  // Bagikan postingan ke chat: snapshot postingan saat dikirim
  // (ala IG: kotak postingan di dalam percakapan).
  // - Gambar: header avatar+username, media gambar, deskripsi (kalau ada).
  // - Video: header avatar+username + cuplikan awal video.
  @Column({ type: 'uuid', nullable: true })
  postId: string | null;

  @Column({ type: 'text', nullable: true })
  postMediaUrl: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postMediaType: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  postOwnerUsername: string | null;

  @Column({ type: 'text', nullable: true })
  postOwnerAvatar: string | null;

  @Column({ type: 'text', nullable: true })
  postContent: string | null;

  @Column({ type: 'int', default: 1 })
  postMediaCount: number;

  // Lampiran chat (ala WA/IG): 1 file per pesan.
  // - Gambar (galeri): fileType = 'image', bubble tampil sebagai gambar.
  // - Dokumen: fileType = 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' |
  //   'ppt' | 'pptx' | 'txt', bubble tampil sebagai kartu dokumen.
  // Kalau text-nya teks default (FILE/IMAGE_SHARE_DEFAULT_TEXT di frontend),
  // bubble teks disembunyikan, hanya kotak lampiran yang tampil.
  @Column({ type: 'text', nullable: true })
  fileUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  fileType: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
