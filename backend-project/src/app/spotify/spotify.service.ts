import { BadGatewayException, Injectable } from '@nestjs/common';

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  previewUrl: string | null;
  spotifyUrl: string | null;
}

// Sumber musik Lentera Story: iTunes Search API + RSS Top Songs Indonesia.
// Gratis, tanpa API key, tanpa Premium. Bentuk respons disamakan dengan
// SpotifyTrack agar frontend (MusicPanel) tidak perlu diubah.
// Catatan: preview iTunes ±30 detik, frontend memotong jadi 15 detik pertama
// mengikuti aturan Lentera Story 15 detik.
@Injectable()
export class SpotifyService {
  private upscaleArtwork(url: string | null): string | null {
    if (!url) return null;
    return url.replace(/\/\d+x\d+bb\.(png|jpg)/, '/600x600bb.jpg');
  }

  private mapRssEntry(e: any): SpotifyTrack {
    const images: { label?: string }[] = Array.isArray(e?.['im:image'])
      ? e['im:image']
      : [];
    const rawCover = images.length
      ? (images[images.length - 1]?.label ?? null)
      : null;
    const links: any[] = Array.isArray(e?.link) ? e.link : [];
    const preview =
      links.find((l) => l?.attributes?.['im:assetType'] === 'preview')
        ?.attributes?.href ?? null;
    return {
      id: String(e?.id?.attributes?.['im:id'] ?? e?.id?.label ?? ''),
      title: String(e?.['im:name']?.label ?? 'Tanpa judul'),
      artist: String(e?.['im:artist']?.label ?? 'Artis tidak diketahui'),
      cover: this.upscaleArtwork(rawCover),
      previewUrl: preview,
      spotifyUrl: e?.id?.label ?? null,
    };
  }

  private mapSearchTrack(t: any): SpotifyTrack {
    return {
      id: String(t?.trackId ?? t?.collectionId ?? ''),
      title: String(t?.trackName ?? 'Tanpa judul'),
      artist: String(t?.artistName ?? 'Artis tidak diketahui'),
      cover: this.upscaleArtwork(t?.artworkUrl100 ?? null),
      previewUrl: t?.previewUrl ?? null,
      spotifyUrl: t?.trackViewUrl ?? null,
    };
  }

  // 30 lagu tren Indonesia dari RSS Apple Music.
  async trending(): Promise<{ message: string; data: SpotifyTrack[] }> {
    try {
      const res = await fetch(
        'https://itunes.apple.com/id/rss/topsongs/limit=30/json',
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) {
        throw new Error(`iTunes RSS ${res.status}`);
      }
      const json = (await res.json()) as { feed?: { entry?: any[] } };
      const tracks = (json.feed?.entry ?? [])
        .map((e) => this.mapRssEntry(e))
        .filter((t) => t.id)
        .slice(0, 30);
      return { message: 'OK', data: tracks };
    } catch {
      throw new BadGatewayException('Gagal mengambil lagu tren');
    }
  }

  async search(
    q: string,
    limit = 20,
  ): Promise<{ message: string; data: SpotifyTrack[] }> {
    const query = q?.trim();
    if (!query) {
      return { message: 'OK', data: [] };
    }
    try {
      const params = new URLSearchParams({
        term: query,
        media: 'music',
        entity: 'song',
        limit: String(Math.max(1, Math.min(30, limit))),
        country: 'ID',
      });
      const res = await fetch(`https://itunes.apple.com/search?${params}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`iTunes search ${res.status}`);
      }
      const json = (await res.json()) as { results?: any[] };
      return {
        message: 'OK',
        data: (json.results ?? []).map((t) => this.mapSearchTrack(t)),
      };
    } catch {
      throw new BadGatewayException('Gagal mencari lagu');
    }
  }
}
