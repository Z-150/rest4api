import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  private async runCommand(cmd: string): Promise<string> {
    this.logger.debug(`Instagram CMD: ${cmd}`);
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 90_000,
        maxBuffer: 20 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (err: any) {
      const msg = err.stderr ?? err.message ?? '';
      this.logger.error(`Instagram cmd failed: ${msg}`);
      throw new InternalServerErrorException(
        `Gagal ekstrak Instagram: ${msg.split('\n')[0]}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Ekstrak info dari post/reels/story Instagram via yt-dlp
  // (yt-dlp juga support Instagram sehingga tidak perlu login untuk public post)
  // ─────────────────────────────────────────────────────────────────────────────
  async extractPost(url: string, type: string = 'all'): Promise<any> {
    this.validateInstagramUrl(url);

    // Gunakan yt-dlp yang lebih reliable untuk public Instagram
    const cmd = `yt-dlp --no-playlist -j "${url}"`;
    const raw = await this.runCommand(cmd);

    let data: any;
    try {
      // Bisa multi-line JSON jika carousel (tiap baris = 1 item)
      const lines = raw.trim().split('\n').filter(Boolean);
      const parsed = lines.map((l) => JSON.parse(l));
      data = parsed;
    } catch {
      throw new InternalServerErrorException('Gagal parse response Instagram');
    }

    const mediaItems = data.map((item: any) => {
      const isVideo = item.ext !== 'jpg' && item.ext !== 'png' && item.vcodec !== 'none';
      const itemType = isVideo ? 'video' : 'image';

      if (type !== 'all' && itemType !== type) return null;

      return {
        type: itemType,
        title: item.title,
        url: item.url,
        thumbnail: item.thumbnail,
        ext: item.ext,
        duration: item.duration ?? null,
        width: item.width ?? null,
        height: item.height ?? null,
      };
    }).filter(Boolean);

    if (mediaItems.length === 0) {
      throw new BadRequestException(
        `Tidak ada media bertipe "${type}" ditemukan di URL ini.`,
      );
    }

    const first = data[0];
    return {
      success: true,
      platform: 'instagram',
      id: first?.id,
      title: first?.title,
      description: first?.description?.substring(0, 300),
      uploader: first?.uploader,
      upload_date: first?.upload_date,
      thumbnail: first?.thumbnail,
      total_media: mediaItems.length,
      media: mediaItems,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Validasi URL Instagram
  // ─────────────────────────────────────────────────────────────────────────────
  private validateInstagramUrl(url: string): void {
    if (!url.includes('instagram.com')) {
      throw new BadRequestException(
        'URL harus berasal dari instagram.com (contoh: https://www.instagram.com/p/xxxxx/)',
      );
    }
    const validPaths = ['/p/', '/reel/', '/reels/', '/tv/', '/stories/'];
    const hasValidPath = validPaths.some((p) => url.includes(p));
    if (!hasValidPath) {
      throw new BadRequestException(
        'URL Instagram tidak valid. Pastikan URL post, reel, atau story yang dimasukkan.',
      );
    }
  }
}
