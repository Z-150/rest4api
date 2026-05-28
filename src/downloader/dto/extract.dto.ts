import { IsString, IsUrl, IsOptional, IsEnum } from 'class-validator';

export enum VideoFormat {
  MP4 = 'mp4',
  MP3 = 'mp3',
  BEST = 'best',
}

export enum VideoQuality {
  BEST = 'best',
  HD = '1080',
  SD = '720',
  LOW = '480',
  WORST = 'worst',
}

export class ExtractDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL yang valid' })
  url: string;

  @IsOptional()
  @IsEnum(VideoFormat, { message: 'Format harus: mp4, mp3, atau best' })
  format?: VideoFormat = VideoFormat.MP4;

  @IsOptional()
  @IsEnum(VideoQuality, { message: 'Quality harus: best, 1080, 720, 480, worst' })
  quality?: VideoQuality = VideoQuality.BEST;
}

export class ExtractInfoDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL yang valid' })
  url: string;
}

export class ExtractAudioDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL yang valid' })
  url: string;

  @IsOptional()
  @IsEnum(['128', '192', '256', '320'], { message: 'Audio quality harus: 128, 192, 256, atau 320' })
  audioQuality?: string = '192';
}
