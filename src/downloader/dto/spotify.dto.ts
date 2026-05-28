import { IsString, IsUrl } from 'class-validator';

export class SpotifyDto {
  @IsString()
  @IsUrl({}, { message: 'URL harus berupa URL Spotify yang valid' })
  url: string;
}
