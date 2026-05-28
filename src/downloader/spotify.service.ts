import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);

  private async runCommand(cmd: string): Promise<string> {
    this.logger.debug(`Spotify CMD: ${cmd}`);
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 300_000, // 5 menit (konversi audio bisa lama)
        maxBuffer: 50 * 1024 * 1024,
      });
      return (stdout + '\n' + stderr).trim();
    } catch (err: any) {
      const msg = err.stderr ?? err.stdout ?? err.message ?? '';
      this.logger.error(`Spotify cmd failed: ${msg}`);
      throw new InternalServerErrorException(
        `Gagal proses Spotify: ${msg.split('\n')[0]}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET METADATA Spotify (tanpa download) — menggunakan spotdl --print-errors
  // ─────────────────────────────────────────────────────────────────────────────
  async getSpotifyInfo(url: string): Promise<any> {
    this.validateSpotifyUrl(url);

    const urlType = this.detectSpotifyUrlType(url);

    // spotdl dapat mengambil metadata lagu dari Spotify API
    const cmd = `spotdl url "${url}" 2>&1 | head -50`;
    let raw = '';
    try {
      raw = await this.runCommand(cmd);
    } catch {
      // fallback - spotdl url command mungkin berbeda versi
      raw = 'Tidak dapat mengambil info tanpa download';
    }

    return {
      success: true,
      platform: 'spotify',
      url_type: urlType,
      url,
      raw_output: raw.substring(0, 500),
      note: `Gunakan endpoint POST /api/spotify/download untuk download lagu.`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOWNLOAD Spotify sebagai MP3 dengan metadata lengkap
  // ─────────────────────────────────────────────────────────────────────────────
  async downloadTrack(url: string): Promise<any> {
    this.validateSpotifyUrl(url);

    const urlType = this.detectSpotifyUrlType(url);
    const outputDir = path.join(process.cwd(), 'downloads', 'spotify');

    // Pastikan folder download ada
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    this.logger.log(`Downloading Spotify ${urlType}: ${url}`);

    // spotdl download dengan output ke folder tertentu
    const cmd = `spotdl download "${url}" --output "${outputDir}/{artist} - {title}.{output-ext}" --format mp3 2>&1`;
    const raw = await this.runCommand(cmd);

    // Ambil file yang baru didownload
    const files = fs.readdirSync(outputDir)
      .filter((f) => f.endsWith('.mp3'))
      .map((f) => ({
        filename: f,
        path: path.join(outputDir, f),
        size_bytes: fs.statSync(path.join(outputDir, f)).size,
        download_url: `/downloads/spotify/${encodeURIComponent(f)}`,
      }))
      .sort((a, b) => {
        const aStat = fs.statSync(a.path);
        const bStat = fs.statSync(b.path);
        return bStat.mtime.getTime() - aStat.mtime.getTime();
      });

    const latestFile = files[0];

    return {
      success: true,
      platform: 'spotify',
      url_type: urlType,
      status: 'downloaded',
      file: latestFile ?? null,
      raw_output: raw.substring(0, 800),
      note:
        urlType === 'track'
          ? 'Lagu berhasil didownload sebagai MP3 dengan metadata (cover art, lirik, dll).'
          : `${urlType === 'album' ? 'Album' : 'Playlist'} sedang didownload. Cek folder downloads/spotify.`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilitas
  // ─────────────────────────────────────────────────────────────────────────────
  private validateSpotifyUrl(url: string): void {
    if (!url.includes('open.spotify.com')) {
      throw new BadRequestException(
        'URL harus berasal dari open.spotify.com (contoh: https://open.spotify.com/track/xxxxx)',
      );
    }
  }

  private detectSpotifyUrlType(url: string): string {
    if (url.includes('/track/')) return 'track';
    if (url.includes('/album/')) return 'album';
    if (url.includes('/playlist/')) return 'playlist';
    if (url.includes('/artist/')) return 'artist';
    return 'unknown';
  }
}
