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

@Entity('communities')
export class Community {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @OneToMany(() => CommunityMember, (m) => m.community)
  members: CommunityMember[];

  @OneToMany(() => CommunityMessage, (m) => m.community)
  messages: CommunityMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('community_members')
@Unique(['communityId', 'userId'])
export class CommunityMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Community, (c) => c.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'communityId' })
  community: Community;

  @Column()
  communityId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  // Kapan anggota ini masuk — dipakai untuk filter history:
  // pesan (termasuk event lama) dengan createdAt < joinedAt disembunyikan
  // khusus untuk anggota ini. Event join miliknya sendiri dibuat tepat
  // saat join sehingga tetap terlihat.
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  // Clear chat per-anggota (khusus untuk saya, anggota lain tidak ikut).
  @Column({ type: 'datetime', nullable: true })
  clearedAt: Date | null;

  // Terakhir dibaca per-anggota (konsep baca ala WA):
  // unread = pesan orang lain dengan createdAt > max(joinedAt/clearedAt, lastReadAt).
  @Column({ type: 'datetime', nullable: true })
  lastReadAt: Date | null;

  // Co-admin: bisa tambah anggota / naikkan admin / keluarkan anggota.
  // Owner (communities.ownerId) selalu admin.
  @Column({ default: false })
  isAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('community_messages')
export class CommunityMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Community, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'communityId' })
  community: Community;

  @Column()
  communityId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  sender: User | null;

  @Column({ nullable: true })
  senderId: string | null;

  @Column({ type: 'text' })
  text: string;

  // Event permanen ala DM (mis. "'username' telah ditambahkan"):
  // tampil di tengah sebagai kotak sistem, ikut tersimpan.
  @Column({ default: false })
  isEvent: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
