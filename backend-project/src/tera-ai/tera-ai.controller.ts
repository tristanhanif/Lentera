import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AtGuard } from 'src/common/guards/at.guard';
import { TeraAiService } from './tera-ai.service';
import { TeraChatDto } from './dto/tera.dto';

@UseGuards(AtGuard)
@Controller('ai/tera')
export class TeraAiController {
  constructor(
    private readonly teraAiService: TeraAiService,
    @Inject(REQUEST) private req: { user: { sub: string } },
  ) {}

  @Post('chat')
  async chat(@Body() dto: TeraChatDto) {
    const data = await this.teraAiService.chat(this.req.user.sub, dto);
    return { message: 'OK', data };
  }
}
