import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Column,
} from 'typeorm';
import { Posts } from './posts.entity';
import { User } from './user.entity';

@Entity('reposts')
export class Reposts {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  // Isi kotak "Tambahkan pendapat..." milik perepost (maks 200 karakter).
  @Column({ type: 'text', nullable: true })
  pendapat: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Posts, (post) => post.reposts, { onDelete: 'CASCADE' })
  post: Posts;
}
