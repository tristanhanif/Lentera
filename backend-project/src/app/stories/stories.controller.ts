import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { CreateStoryCommentDto } from './dto/create-comment.dto';
import { AtGuard } from 'src/common/guards/at.guard';

@UseGuards(AtGuard)
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateStoryDto) {
    return this.storiesService.create(dto);
  }

  @Get('feed')
  async feed() {
    return this.storiesService.feed();
  }

  @Post('maintenance/cleanup-expired')
  @HttpCode(HttpStatus.OK)
  async cleanupExpired() {
    return this.storiesService.cleanupExpired();
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.storiesService.detail(id);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  async markViewed(@Param('id') id: string) {
    return this.storiesService.markViewed(id);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async toggleLike(@Param('id') id: string) {
    return this.storiesService.toggleLike(id);
  }

  @Get(':id/viewers')
  async getViewers(@Param('id') id: string) {
    return this.storiesService.getViewers(id);
  }

  @Post(':id/comment')
  @HttpCode(HttpStatus.CREATED)
  async commentStory(@Param('id') id: string, @Body() dto: CreateStoryCommentDto) {
    return this.storiesService.commentStory(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteStory(@Param('id') id: string) {
    return this.storiesService.deleteStory(id);
  }
}
