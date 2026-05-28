import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DownloaderService } from './downloader.service';
import { InstagramService } from './instagram.service';
import { SpotifyService } from './spotify.service';
import { PlatformsService } from './platforms.service';
import { ExtractDto, ExtractInfoDto, ExtractAudioDto } from './dto/extract.dto';
import { InstagramDto } from './dto/instagram.dto';
import { SpotifyDto } from './dto/spotify.dto';
import {
  TikTokDto,
  TwitterDto,
  FacebookDto,
  SoundCloudDto,
  ThumbnailDto,
  PlaylistDto,
  SubtitlesDto,
  BatchDto,
  YoutubeSearchDto,
} from './dto/platforms.dto';

@Controller()
export class DownloaderController {
  private readonly logger = new Logger(DownloaderController.name);

  constructor(
    private readonly downloaderService: DownloaderService,
    private readonly instagramService: InstagramService,
    private readonly spotifyService: SpotifyService,
    private readonly platformsService: PlatformsService,
  ) {}

  // ─── SYSTEM ──────────────────────────────────────────────────────────────────

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
        { method: 'GET',    path: '/api/health',                  desc: 'Health check' },
        { method: 'GET',    path: '/api/sites',                   desc: 'Daftar situs yang didukung' },
        { method: 'POST',   path: '/api/extract',                 desc: 'Universal video downloader' },
        { method: 'POST',   path: '/api/extract/info',            desc: 'Metadata saja' },
        { method: 'POST',   path: '/api/extract/audio',           desc: 'Audio/MP3 CDN link' },
        { method: 'POST',   path: '/api/instagram',               desc: 'Instagram post/reels/stories' },
        { method: 'POST',   path: '/api/spotify',                 desc: 'Spotify info' },
        { method: 'POST',   path: '/api/spotify/download',        desc: 'Spotify → MP3 download' },
        { method: 'POST',   path: '/api/tiktok',                  desc: 'TikTok tanpa watermark' },
        { method: 'POST',   path: '/api/twitter',                 desc: 'Twitter/X video & GIF' },
        { method: 'POST',   path: '/api/facebook',                desc: 'Facebook video publik' },
        { method: 'POST',   path: '/api/soundcloud',              desc: 'SoundCloud → MP3' },
        { method: 'POST',   path: '/api/thumbnail',               desc: 'Ambil thumbnail saja' },
        { method: 'POST',   path: '/api/youtube/search',          desc: 'Cari YouTube → CDN link top 1' },
        { method: 'POST',   path: '/api/youtube/playlist',        desc: 'Ekstrak semua video playlist' },
        { method: 'POST',   path: '/api/youtube/subtitles',       desc: 'Download subtitle/caption' },
        { method: 'POST',   path: '/api/batch',                   desc: 'Proses banyak URL sekaligus (max 10)' },
        { method: 'GET',    path: '/api/downloads',               desc: 'List file yang sudah didownload' },
        { method: 'DELETE', path: '/api/downloads/:folder/:file', desc: 'Hapus file download' },
      ],
    };
  }

  @Get('sites')
  @HttpCode(HttpStatus.OK)
  async getSupportedSites() {
    this.logger.log('GET /api/sites');
    return this.downloaderService.getSupportedSites();
  }

  // ─── UNIVERSAL ───────────────────────────────────────────────────────────────

  @Post('extract')
  @HttpCode(HttpStatus.OK)
  async extract(@Body() dto: ExtractDto) {
    this.logger.log(`POST /api/extract — ${dto.url}`);
    if (dto.format === 'mp3') return this.downloaderService.extractAudio(dto.url, '192');
    return this.downloaderService.extractVideo(dto.url, dto.quality);
  }

  @Post('extract/info')
  @HttpCode(HttpStatus.OK)
  async extractInfo(@Body() dto: ExtractInfoDto) {
    this.logger.log(`POST /api/extract/info — ${dto.url}`);
    return this.downloaderService.getInfo(dto.url);
  }

  @Post('extract/audio')
  @HttpCode(HttpStatus.OK)
  async extractAudio(@Body() dto: ExtractAudioDto) {
    this.logger.log(`POST /api/extract/audio — ${dto.url}`);
    return this.downloaderService.extractAudio(dto.url, dto.audioQuality);
  }

  // ─── INSTAGRAM ───────────────────────────────────────────────────────────────

  @Post('instagram')
  @HttpCode(HttpStatus.OK)
  async instagram(@Body() dto: InstagramDto) {
    this.logger.log(`POST /api/instagram — ${dto.url}`);
    return this.instagramService.extractPost(dto.url, dto.type);
  }

  // ─── SPOTIFY ─────────────────────────────────────────────────────────────────

  @Post('spotify')
  @HttpCode(HttpStatus.OK)
  async spotifyInfo(@Body() dto: SpotifyDto) {
    this.logger.log(`POST /api/spotify — ${dto.url}`);
    return this.spotifyService.getSpotifyInfo(dto.url);
  }

  @Post('spotify/download')
  @HttpCode(HttpStatus.OK)
  async spotifyDownload(@Body() dto: SpotifyDto) {
    this.logger.log(`POST /api/spotify/download — ${dto.url}`);
    return this.spotifyService.downloadTrack(dto.url);
  }

  // ─── TIKTOK ──────────────────────────────────────────────────────────────────

  @Post('tiktok')
  @HttpCode(HttpStatus.OK)
  async tiktok(@Body() dto: TikTokDto) {
    this.logger.log(`POST /api/tiktok — ${dto.url}`);
    return this.platformsService.extractTikTok(dto.url, dto.format);
  }

  // ─── TWITTER ─────────────────────────────────────────────────────────────────

  @Post('twitter')
  @HttpCode(HttpStatus.OK)
  async twitter(@Body() dto: TwitterDto) {
    this.logger.log(`POST /api/twitter — ${dto.url}`);
    return this.platformsService.extractTwitter(dto.url, dto.format);
  }

  // ─── FACEBOOK ────────────────────────────────────────────────────────────────

  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  async facebook(@Body() dto: FacebookDto) {
    this.logger.log(`POST /api/facebook — ${dto.url}`);
    return this.platformsService.extractFacebook(dto.url);
  }

  // ─── SOUNDCLOUD ──────────────────────────────────────────────────────────────

  @Post('soundcloud')
  @HttpCode(HttpStatus.OK)
  async soundcloud(@Body() dto: SoundCloudDto) {
    this.logger.log(`POST /api/soundcloud — ${dto.url}`);
    return this.platformsService.extractSoundCloud(dto.url);
  }

  // ─── THUMBNAIL ───────────────────────────────────────────────────────────────

  @Post('thumbnail')
  @HttpCode(HttpStatus.OK)
  async thumbnail(@Body() dto: ThumbnailDto) {
    this.logger.log(`POST /api/thumbnail — ${dto.url}`);
    return this.platformsService.getThumbnail(dto.url);
  }

  // ─── YOUTUBE SEARCH ──────────────────────────────────────────────────────────

  @Post('youtube/search')
  @HttpCode(HttpStatus.OK)
  async youtubeSearch(@Body() dto: YoutubeSearchDto) {
    this.logger.log(`POST /api/youtube/search — query="${dto.query}" format=${dto.format}`);
    return this.platformsService.searchYoutube(dto.query, dto.format, dto.quality);
  }

  // ─── YOUTUBE PLAYLIST ────────────────────────────────────────────────────────

  @Post('youtube/playlist')
  @HttpCode(HttpStatus.OK)
  async youtubePlaylist(@Body() dto: PlaylistDto) {
    this.logger.log(`POST /api/youtube/playlist — ${dto.url}`);
    return this.platformsService.extractPlaylist(dto.url);
  }

  // ─── YOUTUBE SUBTITLES ───────────────────────────────────────────────────────

  @Post('youtube/subtitles')
  @HttpCode(HttpStatus.OK)
  async youtubeSubtitles(@Body() dto: SubtitlesDto) {
    this.logger.log(`POST /api/youtube/subtitles — ${dto.url} lang=${dto.lang}`);
    return this.platformsService.getSubtitles(dto.url, dto.lang);
  }

  // ─── BATCH ───────────────────────────────────────────────────────────────────

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async batch(@Body() dto: BatchDto) {
    this.logger.log(`POST /api/batch — ${dto.urls?.length} URLs`);
    return this.platformsService.processBatch(dto.urls, dto.format);
  }

  // ─── DOWNLOADS MANAGEMENT ────────────────────────────────────────────────────

  @Get('downloads')
  @HttpCode(HttpStatus.OK)
  listDownloads() {
    this.logger.log('GET /api/downloads');
    return this.platformsService.listDownloads();
  }

  @Delete('downloads/:folder/:filename')
  @HttpCode(HttpStatus.OK)
  deleteDownload(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
  ) {
    this.logger.log(`DELETE /api/downloads/${folder}/${filename}`);
    return this.platformsService.deleteDownload(folder, filename);
  }
}
