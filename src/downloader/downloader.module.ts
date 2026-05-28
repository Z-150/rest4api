import { Module } from '@nestjs/common';
import { DownloaderController } from './downloader.controller';
import { DownloaderService } from './downloader.service';
import { InstagramService } from './instagram.service';
import { SpotifyService } from './spotify.service';

@Module({
  controllers: [DownloaderController],
  providers: [DownloaderService, InstagramService, SpotifyService],
})
export class DownloaderModule {}
