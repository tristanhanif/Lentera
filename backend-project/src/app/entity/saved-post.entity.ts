import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Posts } from './posts.entity';
import { User } from './user.entity';

@Entity('saved_posts')
@Unique(['user', 'post'])
export class SavedPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Posts, { onDelete: 'CASCADE' })
  post: Posts;
}
