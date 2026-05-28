import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DownloaderModule } from './downloader/downloader.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Serve file statis dari folder public/ — akses di http://localhost:3000
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'], // Jangan intercept route API
    }),
    DownloaderModule,
  ],
})
export class AppModule {}
