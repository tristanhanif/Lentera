import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { Comments } from './comment.entity';

@Entity('comment_likes')
@Unique(['user', 'comment'])
export class CommentLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Comments, (comment) => comment.commentLikes, { onDelete: 'CASCADE' })
  comment: Comments;
}
