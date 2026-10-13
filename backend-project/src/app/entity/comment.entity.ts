import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Posts } from './posts.entity';
import { CommentLike } from './comment-like.entity';

@Entity('comments')
export class Comments {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @CreateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Posts, (post) => post.comments, { onDelete: 'CASCADE' })
  post!: Posts;

  @ManyToOne(() => Comments, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent!: Comments | null;

  @OneToMany(() => Comments, (comment) => comment.parent)
  replies: Comments[];

  @OneToMany(() => CommentLike, (like) => like.comment)
  commentLikes: CommentLike[];
}
