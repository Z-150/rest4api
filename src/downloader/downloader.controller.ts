import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DownloaderService } from './downloader.service';
import { InstagramService } from './instagram.service';
import { SpotifyService } from './spotify.service';
import { ExtractDto, ExtractInfoDto, ExtractAudioDto } from './dto/extract.dto';
import { InstagramDto } from './dto/instagram.dto';
import { SpotifyDto } from './dto/spotify.dto';

@Controller()
export class DownloaderController {
  private readonly logger = new Logger(DownloaderController.name);

  constructor(
    private readonly downloaderService: DownloaderService,
    private readonly instagramService: InstagramService,
    private readonly spotifyService: SpotifyService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/health
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return {
      success: true,
      status: 'ok',
      message: 'Media Downloader API is running 🚀',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      endpoints: [
        { method: 'POST', path: '/api/extract',        desc: 'Universal downloader — YouTube, TikTok, Twitter, dll' },
        { method: 'POST', path: '/api/extract/info',   desc: 'Hanya metadata/info tanpa download' },
        { method: 'POST', path: '/api/extract/audio',  desc: 'Ekstrak audio/MP3 dari video' },
        { method: 'POST', path: '/api/instagram',      desc: 'Instagram posts, reels, stories, carousel' },
        { method: 'POST', path: '/api/spotify',        desc: 'Spotify track/album/playlist info' },
        { method: 'POST', path: '/api/spotify/download', desc: 'Download Spotify sebagai MP3' },
        { method: 'GET',  path: '/api/sites',          desc: 'Daftar situs yang didukung' },
        { method: 'GET',  path: '/api/health',         desc: 'Health check' },
      ],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/sites — Daftar situs yang didukung yt-dlp
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('sites')
  @HttpCode(HttpStatus.OK)
  async getSupportedSites() {
    this.logger.log('GET /api/sites');
    return this.downloaderService.getSupportedSites();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/extract — Universal Video Downloader (YouTube, TikTok, Twitter, dll)
  // Body: { url: string, format?: "mp4"|"mp3"|"best", quality?: "best"|"1080"|"720"|"480"|"worst" }
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('extract')
  @HttpCode(HttpStatus.OK)
  async extract(@Body() dto: ExtractDto) {
    this.logger.log(`POST /api/extract — url=${dto.url} format=${dto.format} quality=${dto.quality}`);

    if (dto.format === 'mp3') {
      return this.downloaderService.extractAudio(dto.url, '192');
    }
    return this.downloaderService.extractVideo(dto.url, dto.quality);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/extract/info — Ambil metadata saja, tanpa link download
  // Body: { url: string }
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('extract/info')
  @HttpCode(HttpStatus.OK)
  async extractInfo(@Body() dto: ExtractInfoDto) {
    this.logger.log(`POST /api/extract/info — url=${dto.url}`);
    return this.downloaderService.getInfo(dto.url);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/extract/audio — Ekstrak audio stream (MP3/m4a/opus)
  // Body: { url: string, audioQuality?: "128"|"192"|"256"|"320" }
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('extract/audio')
  @HttpCode(HttpStatus.OK)
  async extractAudio(@Body() dto: ExtractAudioDto) {
    this.logger.log(`POST /api/extract/audio — url=${dto.url} quality=${dto.audioQuality}`);
    return this.downloaderService.extractAudio(dto.url, dto.audioQuality);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/instagram — Ekstrak media dari Instagram
  // Body: { url: string, type?: "image"|"video"|"all" }
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('instagram')
  @HttpCode(HttpStatus.OK)
  async instagram(@Body() dto: InstagramDto) {
    this.logger.log(`POST /api/instagram — url=${dto.url} type=${dto.type}`);
    return this.instagramService.extractPost(dto.url, dto.type);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/spotify — Info metadata Spotify
  // Body: { url: string }
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('spotify')
  @HttpCode(HttpStatus.OK)
  async spotifyInfo(@Body() dto: SpotifyDto) {
    this.logger.log(`POST /api/spotify — url=${dto.url}`);
    return this.spotifyService.getSpotifyInfo(dto.url);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/spotify/download — Download Spotify track/album/playlist sebagai MP3
  // Body: { url: string }
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('spotify/download')
  @HttpCode(HttpStatus.OK)
  async spotifyDownload(@Body() dto: SpotifyDto) {
    this.logger.log(`POST /api/spotify/download — url=${dto.url}`);
    return this.spotifyService.downloadTrack(dto.url);
  }
}
