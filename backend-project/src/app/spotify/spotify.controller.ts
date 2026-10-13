import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { AtGuard } from 'src/common/guards/at.guard';

@UseGuards(AtGuard)
@Controller('spotify')
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get('trending')
  async trending() {
    return this.spotifyService.trending();
  }

  @Get('search')
  async search(@Query('q') q: string, @Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 20;
    return this.spotifyService.search(
      q ?? '',
      Number.isNaN(parsed) ? 20 : parsed,
    );
  }
}
