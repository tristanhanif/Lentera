import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SaveService } from './save.service';
import { AtGuard } from 'src/common/guards/at.guard';
import { IsNotEmpty, IsUUID } from 'class-validator';

class SaveDto {
  @IsNotEmpty()
  @IsUUID()
  postId!: string;
}

class ListQueryDto {
  page?: number;
  limit?: number;
}

@UseGuards(AtGuard)
@Controller('save')
export class SaveController {
  constructor(private readonly saveService: SaveService) {}

  @Post('toggle')
  async toggleSave(@Body() dto: SaveDto) {
    return this.saveService.toggleSave(dto.postId);
  }

  @Get('status/:postId')
  async getSaveStatus(@Param('postId') postId: string) {
    return this.saveService.getSaveStatus(postId);
  }

  @Get('my-posts')
  async getMySavedPosts(@Query() query: ListQueryDto) {
    return this.saveService.getMySavedPosts(query);
  }
}
