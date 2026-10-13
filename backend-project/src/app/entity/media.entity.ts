import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Posts } from './posts.entity';

@Entity('medias')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column()
  type: 'image' | 'video';

  // Urutan slide: media yang diupload pertama = slide 1, dst.
  // Diisi otomatis dari urutan array saat create post.
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Posts, (post) => post.medias, { onDelete: 'CASCADE' })
  post: Posts;
}