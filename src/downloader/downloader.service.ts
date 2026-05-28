import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

@Injectable()
export class DownloaderService {
  private readonly logger = new Logger(DownloaderService.name);

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper: Jalankan perintah CLI
  // ─────────────────────────────────────────────────────────────────────────────
  private async runCommand(command: string): Promise<string> {
    this.logger.debug(`Executing: ${command}`);
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 120_000, // 2 menit
        maxBuffer: 50 * 1024 * 1024, // 50MB
      });
      if (stderr && !stdout) {
        this.logger.warn(`stderr output: ${stderr.substring(0, 300)}`);
      }
      return stdout.trim();
    } catch (err: any) {
      this.logger.error(`Command failed: ${err.message}`);
      throw new InternalServerErrorException(
        `Gagal menjalankan command: ${err.message?.split('\n')[0]}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Deteksi platform dari URL
  // ─────────────────────────────────────────────────────────────────────────────
  detectPlatform(url: string): string {
    if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
    if (/tiktok\.com/.test(url)) return 'tiktok';
    if (/instagram\.com/.test(url)) return 'instagram';
    if (/twitter\.com|x\.com/.test(url)) return 'twitter';
    if (/facebook\.com/.test(url)) return 'facebook';
    if (/twitch\.tv/.test(url)) return 'twitch';
    if (/reddit\.com/.test(url)) return 'reddit';
    if (/vimeo\.com/.test(url)) return 'vimeo';
    if (/dailymotion\.com/.test(url)) return 'dailymotion';
    if (/soundcloud\.com/.test(url)) return 'soundcloud';
    if (/bilibili\.com/.test(url)) return 'bilibili';
    return 'other';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET INFO / METADATA saja (tanpa download) — menggunakan yt-dlp -j
  // ─────────────────────────────────────────────────────────────────────────────
  async getInfo(url: string): Promise<any> {
    const cmd = `yt-dlp --no-playlist -j "${url}"`;
    const raw = await this.runCommand(cmd);

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new InternalServerErrorException('Gagal parse response dari yt-dlp');
    }

    return {
      success: true,
      platform: this.detectPlatform(url),
      id: data.id,
      title: data.title,
      description: data.description?.substring(0, 300),
      duration: data.duration,
      duration_string: data.duration_string,
      uploader: data.uploader ?? data.channel,
      uploader_url: data.uploader_url ?? data.channel_url,
      upload_date: data.upload_date,
      view_count: data.view_count,
      like_count: data.like_count,
      thumbnail: data.thumbnail,
      formats: data.formats?.map((f: any) => ({
        format_id: f.format_id,
        ext: f.ext,
        quality: f.quality,
        resolution: f.resolution,
        filesize: f.filesize,
        vcodec: f.vcodec,
        acodec: f.acodec,
        url: f.url,
      })) ?? [],
      webpage_url: data.webpage_url,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXTRACT VIDEO CDN LINK — menggunakan yt-dlp -g
  // ─────────────────────────────────────────────────────────────────────────────
  async extractVideo(url: string, quality: string = 'best'): Promise<any> {
    // Format selector: video dan audio terpisah agar bisa digabung ffmpeg
    let formatSelector: string;
    switch (quality) {
      case '1080': formatSelector = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]'; break;
      case '720':  formatSelector = 'bestvideo[height<=720]+bestaudio/best[height<=720]'; break;
      case '480':  formatSelector = 'bestvideo[height<=480]+bestaudio/best[height<=480]'; break;
      case 'worst': formatSelector = 'worstvideo+worstaudio/worst'; break;
      default:     formatSelector = 'bestvideo+bestaudio/best'; break;
    }

    // Ambil JSON info sekaligus CDN link
    const infoRaw = await this.runCommand(
      `yt-dlp --no-playlist -j -f "${formatSelector}" "${url}"`,
    );

    let info: any;
    try { info = JSON.parse(infoRaw); } catch {
      throw new InternalServerErrorException('Gagal parse response yt-dlp');
    }

    // Ambil URL langsung (ada kemungkinan requested_formats untuk split stream)
    const cdnUrls: { type: string; url: string; ext: string; resolution?: string }[] = [];
    if (info.requested_formats) {
      for (const f of info.requested_formats) {
        cdnUrls.push({
          type: f.vcodec !== 'none' ? 'video' : 'audio',
          url: f.url,
          ext: f.ext,
          resolution: f.resolution ?? undefined,
        });
      }
    } else {
      cdnUrls.push({
        type: 'video+audio',
        url: info.url,
        ext: info.ext,
        resolution: info.resolution ?? undefined,
      });
    }

    return {
      success: true,
      platform: this.detectPlatform(url),
      id: info.id,
      title: info.title,
      duration: info.duration,
      duration_string: info.duration_string,
      thumbnail: info.thumbnail,
      uploader: info.uploader ?? info.channel,
      upload_date: info.upload_date,
      view_count: info.view_count,
      like_count: info.like_count,
      cdn_urls: cdnUrls,
      webpage_url: info.webpage_url,
      note: cdnUrls.length > 1
        ? 'Stream video dan audio terpisah. Gunakan ffmpeg untuk menggabungkan.'
        : 'Link siap digunakan langsung.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXTRACT AUDIO (MP3) CDN LINK — format audio only
  // ─────────────────────────────────────────────────────────────────────────────
  async extractAudio(url: string, audioQuality: string = '192'): Promise<any> {
    const infoRaw = await this.runCommand(
      `yt-dlp --no-playlist -j -f "bestaudio[ext=m4a]/bestaudio" "${url}"`,
    );

    let info: any;
    try { info = JSON.parse(infoRaw); } catch {
      throw new InternalServerErrorException('Gagal parse response yt-dlp');
    }

    const audioUrl = info.url;
    const requestedFmt = info.requested_formats?.[0];
    const finalUrl = requestedFmt?.url ?? audioUrl;

    return {
      success: true,
      platform: this.detectPlatform(url),
      id: info.id,
      title: info.title,
      duration: info.duration,
      duration_string: info.duration_string,
      thumbnail: info.thumbnail,
      uploader: info.uploader ?? info.channel,
      upload_date: info.upload_date,
      cdn_url: finalUrl,
      ext: requestedFmt?.ext ?? info.ext,
      audio_quality: audioQuality + 'kbps',
      mime_type: 'audio/' + (requestedFmt?.ext ?? info.ext ?? 'mp4'),
      note: 'Gunakan ffmpeg untuk convert ke mp3: ffmpeg -i [cdn_url] -q:a 0 output.mp3',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DAFTAR SITUS YANG DIDUKUNG yt-dlp
  // ─────────────────────────────────────────────────────────────────────────────
  async getSupportedSites(): Promise<any> {
    const raw = await this.runCommand('yt-dlp --list-extractors 2>&1 | head -100');
    const sites = raw.split('\n').filter(Boolean);
    return {
      success: true,
      total_shown: sites.length,
      note: 'Ini hanya 100 dari lebih dari 1000+ situs yang didukung yt-dlp.',
      sites,
    };
  }
}
