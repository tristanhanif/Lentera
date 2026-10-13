import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual } from 'typeorm';
import { Note } from '../app/entity/note.entity';

@Injectable()
export class NotesCleanupService {
  private readonly logger = new Logger(NotesCleanupService.name);
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Sama kayak story: hapus otomatis tiap 10 menit yang sudah >24 jam.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCleanup() {
    try {
      const repo = this.dataSource.getRepository(Note);
      const expired = await repo.find({
        where: { expiresAt: LessThanOrEqual(new Date()) },
      });
      if (expired.length > 0) {
        await repo.remove(expired);
        this.logger.log(
          'Notes cleanup: deleted ' + expired.length + ' expired notes',
        );
      }
    } catch {
      this.logger.error('Notes cleanup failed');
    }
  }
}
