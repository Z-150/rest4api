import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as play from 'play-dl';
import { CommandCache } from '../utils/cache.util';

const execAsync = promisify(exec);

@Injectable()
export class PlatformsService {
  private readonly logger = new Logger(PlatformsService.name);
  private readonly downloadsDir = path.join(process.cwd(), 'downloads');

  private async run(rawCmd: string, timeoutMs = 120_000): Promise<string> {
    // Inject fast flags untuk yt-dlp
    let cmd = rawCmd;
    if (cmd.startsWith('yt-dlp ') && !cmd.includes('--socket-timeout')) {
      cmd = cmd.replace('yt-dlp ', 'yt-dlp --no-warnings --no-check-certificates --socket-timeout 5 --no-mtime ');
    }

    const cached = CommandCache.get(cmd);
    if (cached) {
      this.logger.debug(`[CACHE HIT] ${cmd.substring(0, 120)}`);
      return cached;
    }

    this.logger.debug(`[EXEC] ${cmd.substring(0, 120)}`);
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        timeout: timeoutMs,
        maxBuffer: 50 * 1024 * 1024,
      });
      const out = stdout.trim();
      CommandCache.set(cmd, out);
      return out;
    } catch (err: any) {
      const msg = (err.stderr ?? err.stdout ?? err.message ?? '').split('\n')[0];
      this.logger.error(`CMD failed: ${msg}`);
      throw new InternalServerErrorException(`Gagal: ${msg}`);
    }
  }

  private parseYtDlpJson(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      throw new InternalServerErrorException('Gagal parse response yt-dlp');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIKTOK — video tanpa watermark
  // ─────────────────────────────────────────────────────────────────────────────
  async extractTikTok(url: string, format = 'mp4'): Promise<any> {
    if (!url.includes('tiktok.com')) {
      throw new BadRequestException('URL harus dari tiktok.com');
    }

    // yt-dlp support TikTok tanpa watermark secara native
    const fmtSelector =
      format === 'mp3'
        ? 'bestaudio[ext=m4a]/bestaudio'
        : 'download_addr-2/download_addr/play_addr/0[format_id!=bytevc1_1080p_2455530-0]/best';

    const raw = await this.run(`yt-dlp --no-playlist -j "${url}"`);
    const info = this.parseYtDlpJson(raw);

    // Cari URL format tanpa watermark
    const cdnUrl = info.url ?? info.formats?.find((f: any) => f.format_id?.includes('download_addr'))?.url ?? info.formats?.[0]?.url;

    return {
      success: true,
      platform: 'tiktok',
      id: info.id,
      title: info.title,
      description: info.description?.substring(0, 200),
      duration: info.duration,
      uploader: info.uploader,
      like_count: info.like_count,
      view_count: info.view_count,
      thumbnail: info.thumbnail,
      cdn_url: cdnUrl,
      ext: format === 'mp3' ? 'm4a' : 'mp4',
      watermark: false,
      note: format === 'mp3'
        ? 'Audio stream. Konversi ke mp3: ffmpeg -i [cdn_url] output.mp3'
        : 'Video tanpa watermark TikTok.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TWITTER / X
  // ─────────────────────────────────────────────────────────────────────────────
  async extractTwitter(url: string, format = 'mp4'): Promise<any> {
    if (!url.includes('twitter.com') && !url.includes('x.com')) {
      throw new BadRequestException('URL harus dari twitter.com atau x.com');
    }

    const raw = await this.run(`yt-dlp --no-playlist -j "${url}"`);
    const info = this.parseYtDlpJson(raw);

    const cdnUrls = (info.requested_formats ?? [{ url: info.url, ext: info.ext }]).map((f: any) => ({
      type: f.vcodec !== 'none' ? 'video' : 'audio',
      url: f.url,
      ext: f.ext,
      resolution: f.resolution,
    }));

    return {
      success: true,
      platform: 'twitter',
      id: info.id,
      title: info.title,
      uploader: info.uploader,
      upload_date: info.upload_date,
      thumbnail: info.thumbnail,
      duration: info.duration,
      view_count: info.view_count,
      cdn_urls: cdnUrls,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FACEBOOK
  // ─────────────────────────────────────────────────────────────────────────────
  async extractFacebook(url: string): Promise<any> {
    if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
      throw new BadRequestException('URL harus dari facebook.com atau fb.watch');
    }

    const raw = await this.run(`yt-dlp --no-playlist -j "${url}"`);
    const info = this.parseYtDlpJson(raw);

    const cdnUrls = (info.requested_formats ?? [{ url: info.url, ext: info.ext }]).map((f: any) => ({
      type: f.vcodec !== 'none' ? 'video' : 'audio',
      url: f.url,
      ext: f.ext,
      resolution: f.resolution,
      quality: f.quality_label ?? f.format_note,
    }));

    return {
      success: true,
      platform: 'facebook',
      id: info.id,
      title: info.title,
      uploader: info.uploader,
      duration: info.duration,
      thumbnail: info.thumbnail,
      cdn_urls: cdnUrls,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SOUNDCLOUD → MP3
  // ─────────────────────────────────────────────────────────────────────────────
  async extractSoundCloud(url: string): Promise<any> {
    if (!url.includes('soundcloud.com')) {
      throw new BadRequestException('URL harus dari soundcloud.com');
    }

    const raw = await this.run(`yt-dlp --no-playlist -j -f bestaudio "${url}"`);
    const info = this.parseYtDlpJson(raw);

    const audioUrl = info.requested_formats?.[0]?.url ?? info.url;

    return {
      success: true,
      platform: 'soundcloud',
      id: info.id,
      title: info.title,
      uploader: info.uploader,
      genre: info.genre,
      duration: info.duration,
      duration_string: info.duration_string,
      thumbnail: info.thumbnail,
      cdn_url: audioUrl,
      ext: info.ext ?? 'mp3',
      note: 'Link audio langsung. Konversi ke mp3: ffmpeg -i [cdn_url] output.mp3',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // THUMBNAIL — ambil gambar thumbnail/cover saja
  // ─────────────────────────────────────────────────────────────────────────────
  async getThumbnail(url: string): Promise<any> {
    const raw = await this.run(`yt-dlp --no-playlist -j "${url}"`);
    const info = this.parseYtDlpJson(raw);

    const thumbnails = (info.thumbnails ?? [])
      .filter((t: any) => t.url)
      .sort((a: any, b: any) => (b.width ?? 0) - (a.width ?? 0))
      .slice(0, 5)
      .map((t: any) => ({
        url: t.url,
        width: t.width,
        height: t.height,
        resolution: t.width && t.height ? `${t.width}x${t.height}` : null,
      }));

    return {
      success: true,
      platform: this.detectPlatform(url),
      title: info.title,
      uploader: info.uploader,
      best_thumbnail: info.thumbnail,
      all_thumbnails: thumbnails,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // YOUTUBE PLAYLIST — ekstrak semua video dalam playlist
  // ─────────────────────────────────────────────────────────────────────────────
  async extractPlaylist(url: string): Promise<any> {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      throw new BadRequestException('URL harus dari YouTube');
    }
    if (!url.includes('list=') && !url.includes('/playlist')) {
      throw new BadRequestException('URL harus berupa playlist YouTube (mengandung list=...)');
    }

    try {
      const playlist = await play.playlist_info(url, { incomplete: true });
      const videos = await playlist.all_videos();
      const items = videos.map(v => ({
        id: v.id,
        title: v.title,
        url: v.url,
        duration: v.durationInSec,
        uploader: v.channel?.name,
        thumbnail: v.thumbnails?.[0]?.url ?? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
      }));

      return {
        success: true,
        platform: 'youtube',
        playlist_url: url,
        title: playlist.title,
        total: items.length,
        items,
      };
    } catch (err: any) {
      this.logger.error(`play-dl playlist error: ${err.message}`);
    }

    // Ambil hanya metadata ringan (--flat-playlist = tidak proses tiap video)
    const raw = await this.run(
      `yt-dlp --flat-playlist -j "${url}" 2>&1`,
      180_000,
    );

    const lines = raw.trim().split('\n').filter(l => l.startsWith('{'));
    const items = lines.map((l) => {
      try {
        const v = JSON.parse(l);
        return {
          id: v.id,
          title: v.title,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          duration: v.duration,
          uploader: v.uploader,
          thumbnail: v.thumbnails?.[0]?.url ?? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
        };
      } catch { return null; }
    }).filter(Boolean);

    return {
      success: true,
      platform: 'youtube',
      playlist_url: url,
      total: items.length,
      items,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // YOUTUBE SUBTITLES
  // ─────────────────────────────────────────────────────────────────────────────
  async getSubtitles(url: string, lang = 'id'): Promise<any> {
    // Ambil daftar subtitle yang tersedia
    const raw = await this.run(
      `yt-dlp --no-playlist --list-subs -j "${url}" 2>&1 | head -1`,
    );
    let info: any = {};
    try { info = JSON.parse(raw); } catch {}

    const subs = info.subtitles ?? {};
    const autoSubs = info.automatic_captions ?? {};

    const available = Object.keys(subs).map(l => ({ lang: l, type: 'manual', formats: subs[l].map((s: any) => s.ext) }));
    const autoAvailable = Object.keys(autoSubs).map(l => ({ lang: l, type: 'auto', formats: autoSubs[l].map((s: any) => s.ext) }));

    // Ambil URL subtitle untuk bahasa yang diminta
    const targetSubs = subs[lang] ?? autoSubs[lang] ?? subs['en'] ?? autoSubs['en'];
    const vttSub = targetSubs?.find((s: any) => s.ext === 'vtt') ?? targetSubs?.[0];

    return {
      success: true,
      platform: 'youtube',
      video_url: url,
      requested_lang: lang,
      subtitle_url: vttSub?.url ?? null,
      subtitle_ext: vttSub?.ext ?? null,
      available_manual: available,
      available_auto: autoAvailable.slice(0, 10),
      note: vttSub ? `Subtitle ${lang} tersedia. Unduh URL di atas.` : `Subtitle ${lang} tidak tersedia. Cek available_auto atau available_manual.`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BATCH — proses banyak URL sekaligus
  // ─────────────────────────────────────────────────────────────────────────────
  async processBatch(urls: string[], format = 'mp4'): Promise<any> {
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new BadRequestException('Field "urls" harus berupa array URL yang tidak kosong');
    }
    if (urls.length > 10) {
      throw new BadRequestException('Maksimal 10 URL per batch request');
    }

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const fmtSelector = format === 'mp3'
          ? 'bestaudio[ext=m4a]/bestaudio'
          : 'bestvideo+bestaudio/best';
        const raw = await this.run(`yt-dlp --no-playlist -j -f "${fmtSelector}" "${url}"`);
        const info = this.parseYtDlpJson(raw);
        const cdnUrl = info.requested_formats?.[0]?.url ?? info.url;
        return {
          url,
          success: true,
          title: info.title,
          platform: this.detectPlatform(url),
          cdn_url: cdnUrl,
          ext: info.ext,
          thumbnail: info.thumbnail,
        };
      }),
    );

    const items = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { url: urls[i], success: false, error: (r.reason as any)?.message ?? 'Unknown error' };
    });

    return {
      success: true,
      total: urls.length,
      succeeded: items.filter(i => i.success).length,
      failed: items.filter(i => !i.success).length,
      format,
      items,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // YOUTUBE SEARCH → CDN link top 1 hasil pencarian
  // ─────────────────────────────────────────────────────────────────────────────
  async searchYoutube(query: string, format = 'mp4', quality = 'best'): Promise<any> {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Query pencarian minimal 2 karakter');
    }

    try {
      const searchResults = await play.search(query, { limit: 1 });
      if (!searchResults || searchResults.length === 0) {
        throw new NotFoundException('Video tidak ditemukan');
      }
      
      const videoUrl = searchResults[0].url;
      const info = await play.video_info(videoUrl);
      const details = info.video_details;
      
      const cdnUrls = [];
      if (format === 'mp3') {
         const audioFormat = info.format.find(f => !f.hasVideo && f.hasAudio) || info.format.find(f => f.hasAudio);
         if (audioFormat) cdnUrls.push({ type: 'audio', url: audioFormat.url, ext: audioFormat.container });
      } else {
         const videos = info.format.filter(f => f.hasVideo);
         let videoFormat;
         if (quality === '1080') videoFormat = videos.find(f => f.qualityLabel?.includes('1080')) || videos[0];
         else if (quality === '720') videoFormat = videos.find(f => f.qualityLabel?.includes('720')) || videos[0];
         else if (quality === '480') videoFormat = videos.find(f => f.qualityLabel?.includes('480')) || videos[0];
         else if (quality === 'worst') videoFormat = videos[videos.length - 1];
         else videoFormat = videos[0]; // best is usually first
         
         if (videoFormat) cdnUrls.push({ type: 'video', url: videoFormat.url, ext: videoFormat.container, resolution: videoFormat.qualityLabel });
         
         if (videoFormat && !videoFormat.hasAudio) {
           const audioFormat = info.format.find(f => !f.hasVideo && f.hasAudio);
           if (audioFormat) cdnUrls.push({ type: 'audio', url: audioFormat.url, ext: audioFormat.container });
         }
      }

      return {
        success: true,
        platform: 'youtube',
        query,
        format,
        quality,
        result: {
          id: details.id,
          title: details.title,
          uploader: details.channel?.name,
          duration: details.durationInSec,
          duration_string: details.durationRaw,
          view_count: details.views,
          upload_date: details.uploadedAt,
          thumbnail: details.thumbnails?.[details.thumbnails.length - 1]?.url,
          webpage_url: videoUrl,
          cdn_urls: cdnUrls,
        },
        note: cdnUrls.length > 1
          ? 'Stream terpisah. Gabungkan: ffmpeg -i [video_url] -i [audio_url] -c copy output.mp4'
          : 'CDN link siap digunakan.',
      };
    } catch (err: any) {
      this.logger.error(`play-dl search error: ${err.message}`);
    }

    // fallback to yt-dlp
    const searchUrl = `ytsearch1:${query}`;

    let fmtSelector: string;
    if (format === 'mp3') {
      fmtSelector = 'bestaudio[ext=m4a]/bestaudio';
    } else {
      switch (quality) {
        case '1080': fmtSelector = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]'; break;
        case '720':  fmtSelector = 'bestvideo[height<=720]+bestaudio/best[height<=720]'; break;
        case '480':  fmtSelector = 'bestvideo[height<=480]+bestaudio/best[height<=480]'; break;
        default:     fmtSelector = 'bestvideo+bestaudio/best'; break;
      }
    }

    const raw = await this.run(
      `yt-dlp --no-playlist -j -f "${fmtSelector}" "${searchUrl}"`,
      90_000,
    );
    const info = this.parseYtDlpJson(raw);

    const cdnUrls = (info.requested_formats ?? [{ url: info.url, ext: info.ext }]).map((f: any) => ({
      type: f.vcodec !== 'none' ? 'video' : 'audio',
      url: f.url,
      ext: f.ext,
      resolution: f.resolution,
    }));

    return {
      success: true,
      platform: 'youtube',
      query,
      format,
      quality,
      result: {
        id: info.id,
        title: info.title,
        uploader: info.uploader,
        duration: info.duration,
        duration_string: info.duration_string,
        view_count: info.view_count,
        like_count: info.like_count,
        upload_date: info.upload_date,
        thumbnail: info.thumbnail,
        webpage_url: info.webpage_url ?? `https://www.youtube.com/watch?v=${info.id}`,
        cdn_urls: cdnUrls,
      },
      note: cdnUrls.length > 1
        ? 'Stream terpisah. Gabungkan: ffmpeg -i [video_url] -i [audio_url] -c copy output.mp4'
        : 'CDN link siap digunakan.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST DOWNLOADS
  // ─────────────────────────────────────────────────────────────────────────────
  listDownloads(): any {
    const dirs = ['spotify'];
    const result: any[] = [];

    for (const sub of dirs) {
      const dir = path.join(this.downloadsDir, sub);
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).map((f) => {
        const stat = fs.statSync(path.join(dir, f));
        return {
          filename: f,
          folder: sub,
          size_bytes: stat.size,
          size_mb: (stat.size / 1024 / 1024).toFixed(2),
          modified: stat.mtime.toISOString(),
          download_url: `/downloads/${sub}/${encodeURIComponent(f)}`,
        };
      });
      result.push(...files);
    }

    return {
      success: true,
      total: result.length,
      files: result.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE DOWNLOAD
  // ─────────────────────────────────────────────────────────────────────────────
  deleteDownload(folder: string, filename: string): any {
    const filePath = path.join(this.downloadsDir, folder, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File tidak ditemukan: ${folder}/${filename}`);
    }
    fs.unlinkSync(filePath);
    return { success: true, message: `File ${filename} berhasil dihapus` };
  }

  private detectPlatform(url: string): string {
    if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
    if (/tiktok\.com/.test(url)) return 'tiktok';
    if (/instagram\.com/.test(url)) return 'instagram';
    if (/twitter\.com|x\.com/.test(url)) return 'twitter';
    if (/facebook\.com/.test(url)) return 'facebook';
    if (/soundcloud\.com/.test(url)) return 'soundcloud';
    return 'other';
  }
}
