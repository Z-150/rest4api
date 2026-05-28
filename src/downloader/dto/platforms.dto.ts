import { IsString, IsUrl, IsOptional, IsEnum } from 'class-validator';
import { VideoFormat, VideoQuality } from './extract.dto';

export class TikTokDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL TikTok yang valid' })
  url: string;

  @IsOptional()
  @IsEnum(VideoFormat, { message: 'Format harus: mp4, mp3, atau best' })
  format?: VideoFormat = VideoFormat.MP4;
}

export class TwitterDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL Twitter/X yang valid' })
  url: string;

  @IsOptional()
  @IsEnum(VideoFormat)
  format?: VideoFormat = VideoFormat.MP4;
}

export class FacebookDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL Facebook yang valid' })
  url: string;
}

export class SoundCloudDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL SoundCloud yang valid' })
  url: string;
}

export class ThumbnailDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus valid' })
  url: string;
}

export class PlaylistDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL playlist YouTube yang valid' })
  url: string;
}

export class SubtitlesDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL YouTube yang valid' })
  url: string;

  @IsOptional()
  @IsString()
  lang?: string = 'id';
}

export class BatchDto {
  urls: string[];

  @IsOptional()
  @IsEnum(VideoFormat)
  format?: VideoFormat = VideoFormat.MP4;
}

export class YoutubeSearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsEnum(VideoFormat, { message: 'Format harus: mp4 atau mp3' })
  format?: VideoFormat = VideoFormat.MP4;

  @IsOptional()
  @IsEnum(VideoQuality)
  quality?: VideoQuality = VideoQuality.BEST;
}
