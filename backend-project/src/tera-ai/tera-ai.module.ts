import { Module } from '@nestjs/common';
import { TeraAiService } from './tera-ai.service';
import { TeraAiController } from './tera-ai.controller';

@Module({
  controllers: [TeraAiController],
  providers: [TeraAiService],
  exports: [TeraAiService],
})
export class TeraAiModule {}
