import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Posts } from './posts.entity';
import { User } from './user.entity';
 
@Entity('likes')
export class Likes {
@PrimaryGeneratedColumn('uuid')
  id: string;
  
  @CreateDateColumn()
  createdAt: Date;
 
  @ManyToOne(() => User, (user) => user.likes, { onDelete: 'CASCADE' })
  user: User;
 
  // Relasi ke Post
  @ManyToOne(() => Posts, (post) => post.likes, { onDelete: 'CASCADE' })
  post: Posts;
 
  //   @ManyToOne(() => Post, (post) => post.likes)
  //   post: Post;
}