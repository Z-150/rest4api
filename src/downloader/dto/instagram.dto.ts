import { IsString, IsUrl, IsOptional, IsEnum } from 'class-validator';

export enum InstagramMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  ALL = 'all',
}

export class InstagramDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL Instagram yang valid' })
  url: string;

  @IsOptional()
  @IsEnum(InstagramMediaType, { message: 'Type harus: image, video, atau all' })
  type?: InstagramMediaType = InstagramMediaType.ALL;
}
