import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Media } from './media.entity';
import { Likes } from './like.entity';
import { Comments } from './comment.entity';
import { Reposts } from './repost.entity';
 
 
@Entity('posts')
export class Posts {
  @PrimaryGeneratedColumn('uuid')
  id: string;
 
  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  musicUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  musicTitle: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  musicArtist: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  musicCover: string | null;

  @CreateDateColumn()
  createdAt: Date;
 
  @ManyToOne(() => User, (user) => user.posts)
  user: User;
 
  @OneToMany(() => Media, (media) => media.post, { cascade: true })
  medias: Media[];

  @OneToMany(() => Likes, (like) => like.post, { cascade: true })
  likes: Likes[];

  @OneToMany(() => Comments, (comment) => comment.post)
  comments: Comments[];

  @OneToMany(() => Reposts, (repost) => repost.post)
  reposts: Reposts[];
}