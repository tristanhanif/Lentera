import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { Note } from '../app/entity/note.entity';
import { User } from '../app/entity/user.entity';
import { Follow } from '../app/entity/follow.entity';
import { CloseFriend } from '../app/entity/close-friend.entity';
import { CreateNoteDto, ReplyNoteDto } from './dto/note.dto';
import { ChatService } from '../chat/chat.service';
import { BlocksService } from '../blocks/blocks.service';

// TTL catatan: 24 jam ala IG Notes.
const NOTES_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(CloseFriend)
    private readonly closeRepo: Repository<CloseFriend>,
    private readonly chatService: ChatService,
    private readonly blocksService: BlocksService,
  ) {}

  private toResponse(note: Note, viewerId: string) {
    return {
      id: note.id,
      text: note.text,
      type: note.type,
      musicTitle: note.musicTitle,
      musicArtist: note.musicArtist,
      musicCover: note.musicCover,
      musicUrl: note.musicUrl,
      audience: (note.audience ?? 'mutual') as 'mutual' | 'close',
      createdAt: note.createdAt,
      expiresAt: note.expiresAt,
      isOwn: note.userId === viewerId,
      user: {
        id: note.user?.id ?? note.userId,
        name: note.user?.name ?? '',
        username: note.user?.username ?? '',
        avatar: note.user?.avatar ?? null,
      },
    };
  }

  // 1 user = 1 catatan aktif (upsert). Membuat baru otomatis menimpa yang lama.
  async upsertNote(userId: string, dto: CreateNoteDto) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + NOTES_TTL_MS);

    const existing = await this.noteRepo.findOne({
      where: { userId, expiresAt: MoreThan(now) },
      order: { createdAt: 'DESC' },
    });

    const isMusic = dto.type === 'music';
    const audience = dto.audience === 'close' ? 'close' : 'mutual';

    if (existing) {
      existing.text = dto.text.trim();
      existing.type = isMusic ? 'music' : 'text';
      existing.musicTitle = isMusic ? (dto.musicTitle ?? null) : null;
      existing.musicArtist = isMusic ? (dto.musicArtist ?? null) : null;
      existing.musicCover = isMusic ? (dto.musicCover ?? null) : null;
      existing.musicUrl = isMusic ? (dto.musicUrl ?? null) : null;
      existing.audience = audience;
      existing.expiresAt = expiresAt;
      const saved = await this.noteRepo.save(existing);
      const withUser = await this.noteRepo.findOne({
        where: { id: saved.id },
        relations: ['user'],
      });
      return this.toResponse(withUser!, userId);
    }

    const created = this.noteRepo.create({
      userId,
      text: dto.text.trim(),
      type: isMusic ? 'music' : 'text',
      musicTitle: isMusic ? (dto.musicTitle ?? null) : null,
      musicArtist: isMusic ? (dto.musicArtist ?? null) : null,
      musicCover: isMusic ? (dto.musicCover ?? null) : null,
      musicUrl: isMusic ? (dto.musicUrl ?? null) : null,
      audience,
      expiresAt,
    });
    const saved = await this.noteRepo.save(created);
    const withUser = await this.noteRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
    return this.toResponse(withUser!, userId);
  }

  // Daftar catatan yang terlihat di /messages sisi kiri:
  // milik sendiri (paling depan) + milik mutual followback + milik author
  // yang menjadikan viewer sebagai teman dekat.
  // - audience mutual: terlihat kalau A <-> B saling follow.
  // - audience close: terlihat kalau viewer masuk daftar close_friends author.
  //   (POV satu arah: author memilih, viewer tidak otomatis bisa lihat balik)
  async getVisibleNotes(viewerId: string) {
    const now = new Date();

    const ownNote = await this.noteRepo.findOne({
      where: { userId: viewerId, expiresAt: MoreThan(now) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    // Hanya yang saling follow: irisan following & followers.
    const [followings, followers, closeOwners] = await Promise.all([
      this.followRepo
        .createQueryBuilder('f')
        .where('f.followerId = :viewerId', { viewerId })
        .select('f.followingId', 'id')
        .getRawMany<{ id: string }>(),
      this.followRepo
        .createQueryBuilder('f')
        .where('f.followingId = :viewerId', { viewerId })
        .select('f.followerId', 'id')
        .getRawMany<{ id: string }>(),
      // Author yang menjadikan viewer sebagai teman dekat.
      this.closeRepo
        .createQueryBuilder('c')
        .where('c.friendId = :viewerId', { viewerId })
        .select('c.ownerId', 'id')
        .getRawMany<{ id: string }>(),
    ]);

    const followingIds = new Set(
      followings.map((r) => r.id).filter((id) => id && id !== viewerId),
    );
    const blockedIds = new Set(await this.blocksService.getBlockedIds(viewerId));
    const mutualIds = new Set(
      followers
        .map((r) => r.id)
        .filter((id) => id && id !== viewerId && followingIds.has(id) && !blockedIds.has(id)),
    );
    const closeOwnerIds = new Set(
      closeOwners
        .map((r) => r.id)
        .filter((id) => id && id !== viewerId && !blockedIds.has(id)),
    );

    const candidateIds = [...new Set([...mutualIds, ...closeOwnerIds])];

    let others: Note[] = [];
    if (candidateIds.length > 0) {
      const candidates = await this.noteRepo.find({
        where: {
          userId: In(candidateIds),
          expiresAt: MoreThan(now),
        },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: 100,
      });
      // Filter per audiens: mutual hanya untuk mutual, close hanya untuk
      // viewer yang terdaftar sebagai teman dekat author.
      others = candidates.filter((n) => {
        const aud = (n.audience ?? 'mutual') as 'mutual' | 'close';
        if (aud === 'close') return closeOwnerIds.has(n.userId);
        return mutualIds.has(n.userId);
      });
      others = others.slice(0, 50);
    }

    const result: ReturnType<NotesService['toResponse']>[] = [];
    if (ownNote) result.push(this.toResponse(ownNote, viewerId));
    for (const n of others) {
      // Hindari duplikat kalau user punya >1 catatan (ambil yang terbaru saja).
      if (result.some((r) => r.user.id === n.userId)) continue;
      result.push(this.toResponse(n, viewerId));
    }
    return result;
  }

  async deleteMyNote(viewerId: string) {
    const now = new Date();
    const existing = await this.noteRepo.findOne({
      where: { userId: viewerId, expiresAt: MoreThan(now) },
      order: { createdAt: 'DESC' },
    });
    if (existing) await this.noteRepo.remove(existing);
    return { deleted: true };
  }

  // Balas catatan akun lain -> masuk DM dengan pemilik catatan.
  // Snapshot catatan disimpan di pesan agar tampilan "bubble + avatar +
  // kotak pesan" tetap konsisten ala balas story. Kalau catatan sudah
  // kedaluwarsa saat dibalas -> tolak.
  async replyToNote(viewerId: string, noteId: string, dto: ReplyNoteDto) {
    const text = dto.text?.trim();
    if (!text) {
      throw new BadRequestException('Balasan tidak boleh kosong');
    }
    const now = new Date();
    const note = await this.noteRepo.findOne({
      where: { id: noteId },
      relations: ['user'],
    });
    if (!note || new Date(note.expiresAt).getTime() <= now.getTime()) {
      throw new NotFoundException('Catatan sudah tidak tersedia');
    }
    if (note.userId === viewerId) {
      throw new BadRequestException('Tidak bisa membalas catatan sendiri');
    }
    if (await this.blocksService.isBlockedEitherWay(viewerId, note.userId)) {
      throw new NotFoundException('Catatan sudah tidak tersedia');
    }

    const conversation = await this.chatService.createConversation(
      viewerId,
      note.userId,
    );
    const message = await this.chatService.sendMessage(
      viewerId,
      conversation.id,
      text.slice(0, 500),
      undefined,
      undefined,
      {
        noteId: note.id,
        noteText: note.text,
        noteType: note.type,
        noteMusicTitle: note.musicTitle,
        noteMusicArtist: note.musicArtist,
        noteOwnerUsername: note.user?.username ?? null,
        noteOwnerAvatar: note.user?.avatar ?? null,
        noteExpiresAt: note.expiresAt,
      },
    );

    return {
      noteId: note.id,
      conversationId: conversation.id,
      chatMessage: message,
    };
  }
}
