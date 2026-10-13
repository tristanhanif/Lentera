import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { NotesService } from './notes.service';
import { AtGuard } from '../common/guards/at.guard';
import { UseGuards } from '@nestjs/common';
import { CreateNoteDto, ReplyNoteDto } from './dto/note.dto';

@UseGuards(AtGuard)
@Controller('notes')
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    @Inject(REQUEST) private req: { user: { sub: string } },
  ) {}

  // Dipakai halaman /messages sisi kiri: catatan sendiri + catatan teman.
  @Get()
  async getVisibleNotes() {
    const data = await this.notesService.getVisibleNotes(this.req.user.sub);
    return { message: 'OK', data };
  }

  // Tahap 2 (cara mengisi): frontend tinggal POST ke sini.
  @Post()
  async upsertNote(@Body() dto: CreateNoteDto) {
    const data = await this.notesService.upsertNote(this.req.user.sub, dto);
    return { message: 'OK', data };
  }

  @Delete('me')
  async deleteMyNote() {
    const data = await this.notesService.deleteMyNote(this.req.user.sub);
    return { message: 'OK', data };
  }

  // Balas catatan -> kirim DM ke pemilik catatan + snapshot catatan.
  @Post(':id/reply')
  async replyToNote(@Param('id') id: string, @Body() dto: ReplyNoteDto) {
    const data = await this.notesService.replyToNote(
      this.req.user.sub,
      id,
      dto,
    );
    return { message: 'OK', data };
  }
}
