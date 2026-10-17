import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('stories')
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['photo', 'video'] })
  type: 'photo' | 'video';

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  layout: 'single' | 'split2' | 'grid3' | 'grid4' | null;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  // Stiker musik ala IG: url preview (iTunes ±30 detik) + metadata (opsional).
  // musicStart = detik mulai potongan 15 detik pilihan user (mis. 45 = main 45-60).
  @Column({ type: 'varchar', length: 500, nullable: true })
  musicUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  musicTitle: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  musicArtist: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  musicCover: string | null;

  @Column({ type: 'float', nullable: true })
  musicStart: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  musicMode: 'none' | 'lyrics' | 'vinyl' | null;

  @Column({ type: 'text', nullable: true })
  musicLyrics: string | null;

  // Posisi stiker di kanvas (persen 0-100) + skala 0.5-2. Tahap 2: drag & resize.
  @Column({ type: 'float', nullable: true })
  musicX: number | null;

  @Column({ type: 'float', nullable: true })
  musicY: number | null;

  @Column({ type: 'float', nullable: true })
  musicScale: number | null;

  // Stiker teks ala IG: isi + style + warna box + posisi/skala di kanvas.
  @Column({ type: 'text', nullable: true })
  textContent: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  textStyle: 'modern' | 'classic' | 'typewriter' | 'neon' | 'poster' | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  textBg: string | null;

  @Column({ type: 'float', nullable: true })
  textX: number | null;

  @Column({ type: 'float', nullable: true })
  textY: number | null;

  @Column({ type: 'float', nullable: true })
  textScale: number | null;

  @Column({ type: 'datetime', nullable: true })
  unlockAt: Date | null;

  // Bagikan postingan ke story (khusus gambar tahap 1):
  // snapshot agar tampilan viewer tetap ada walau postingan dihapus.
  @Column({ type: 'varchar', length: 36, nullable: true })
  postId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  postOwnerUsername: string | null;

  @Column({ type: 'int', nullable: true })
  postMediaCount: number | null;

  // Skala kotak postingan (cubit 2 jari di editor, 0.5-2). Viewer ikut.
  @Column({ type: 'float', nullable: true })
  postScale: number | null;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  // Audiens story ala IG Close Friend: public = semua bisa lihat,
  // close = hanya pemilik + akun yang terdaftar sebagai teman dekat pemilik.
  @Column({ type: 'enum', enum: ['public', 'close'], default: 'public' })
  audience: 'public' | 'close';

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { eager: false })
  user: User;

  @OneToMany(() => StoryMedia, (media) => media.story, {
    cascade: true,
    eager: true,
  })
  medias: StoryMedia[];

  @OneToMany(() => StoryView, (view) => view.story, { cascade: true })
  views: StoryView[];

  @OneToMany(() => StoryLike, (like) => like.story)
  likes: StoryLike[];
}

@Entity('story_medias')
export class StoryMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 255 })
  publicId: string;

  @Column({ type: 'enum', enum: ['image', 'video'] })
  type: 'image' | 'video';

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Story, (story) => story.medias, { onDelete: 'CASCADE' })
  story: Story;
}

@Entity('story_views')
@Unique('UQ_story_viewer', ['story', 'viewer'])
export class StoryView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  viewedAt: Date;

  @ManyToOne(() => Story, (story) => story.views, { onDelete: 'CASCADE' })
  story: Story;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  viewer: User;
}

@Entity('story_likes')
@Unique('UQ_story_liker', ['story', 'user'])
export class StoryLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Story, { onDelete: 'CASCADE' })
  story: Story;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
