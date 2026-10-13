import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Param,
  Delete,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create.dto';
import { AtGuard } from 'src/common/guards/at.guard';
import { ListQueryDto } from './dto/list-post.dto';
@UseGuards(AtGuard)
@Controller('posts')
export class PostController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * Endpoint untuk membuat postingan baru
   * Menggunakan JwtAuthGuard agar this.req.user di service tidak undefined
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPostDto: CreatePostDto) {
    return await this.postsService.createPost(createPostDto);
  }

  @Get('random')
  async listRandom(@Query() listQueryDto: ListQueryDto) {
    console.log('quer', listQueryDto);
    return await this.postsService.getRandomFeed(listQueryDto);
  }

  @Get('my-posts')
  async list(@Query() listQueryDto: ListQueryDto) {
    console.log('quer', listQueryDto);
    return await this.postsService.getMyPosts(listQueryDto);
  }

  @Get('user/:userId')
  async userPosts(
    @Param('userId') userId: string,
    @Query() listQueryDto: ListQueryDto,
  ) {
    return await this.postsService.getUserPosts(userId, listQueryDto);
  }

  // Detail 1 postingan (misal dibuka dari kotak postingan di chat).
  // Didaftarkan setelah rute statis agar tidak menelan /random & /my-posts.
  @Get(':id')
  async postDetail(@Param('id') id: string) {
    return await this.postsService.getPostById(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePost(@Param('id') id: string) {
    return await this.postsService.deletePost(id);
  }
}
