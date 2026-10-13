import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, LessThanOrEqual } from "typeorm";
import { v2 as cloudinary } from "cloudinary";
import { Story } from "../entity/story.entity";

@Injectable()
export class StoriesCleanupService {
  private readonly logger = new Logger(StoriesCleanupService.name);
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCleanup() {
    try {
      const repo = this.dataSource.getRepository(Story);
      const expired = await repo.find({ where: { expiresAt: LessThanOrEqual(new Date()) }, relations: ["medias"] });
      for (const story of expired) {
        for (const media of story.medias ?? []) {
          try {
            await cloudinary.uploader.destroy(media.publicId, { resource_type: media.type === "video" ? "video" : "image" });
          } catch {
          }
        }
      }
      if (expired.length > 0) {
        await repo.remove(expired);
        this.logger.log("Stories cleanup: deleted " + expired.length + " expired stories");
      }
    } catch (err) {
      this.logger.error("Stories cleanup failed");
    }
  }
}
