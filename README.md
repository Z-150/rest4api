# 🚀 Media Downloader & CDN Extractor API

REST API berbasis **NestJS** untuk mengekstrak link CDN langsung, video, audio (MP3), dan gambar dari **YouTube, TikTok, Instagram, Spotify, Twitter, Facebook, Twitch**, dan 1000+ platform lainnya.

---

## ✅ Prasyarat Sistem

Pastikan semua tools ini sudah terinstal sebelum memulai:

| Tool | Versi | Kegunaan |
|------|-------|----------|
| Node.js | ≥ 18 | Menjalankan server NestJS |
| npm | ≥ 9 | Manajemen package |
| Python 3 | ≥ 3.8 | Runtime yt-dlp, instaloader, spotdl |
| FFmpeg | Latest | Konversi & merge video/audio |
| yt-dlp | Latest | Engine utama ekstraksi video |
| instaloader | Latest | Spesialis Instagram |
| spotdl | Latest | Spesialis Spotify → MP3 |

---

## 🛠️ Langkah Instalasi (Step-by-Step)

### 1. Instal FFmpeg

**Ubuntu / Debian / WSL:**
```bash
sudo apt update && sudo apt install -y ffmpeg
# Verifikasi:
ffmpeg -version
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:** Unduh dari https://www.gyan.dev/ffmpeg/builds/ → ekstrak → tambahkan folder `bin` ke System PATH.

---

### 2. Instal CLI Tools Python

```bash
pip3 install -U yt-dlp instaloader spotdl
# atau jika error "externally-managed":
pip3 install -U yt-dlp instaloader spotdl --break-system-packages

# Verifikasi:
yt-dlp --version
instaloader --version
spotdl --version
```

---

### 3. Kloning Proyek & Instal Dependensi Node.js

```bash
# Masuk ke folder proyek
cd /path/ke/proyek/ini

# Instal semua dependencies Node.js
npm install
```

---

### 4. Konfigurasi Environment

Buat file `.env` di root proyek (atau edit yang sudah ada):

```bash
# Edit file .env:
nano .env
```

Isi `.env`:
```env
PORT=3000
NODE_ENV=development

# Opsional: Proxy jika IP server diblokir sosmed
# PROXY_URL=http://user:password@ip:port
```

---

### 5. Jalankan Server

**Mode Development** (auto-restart jika kode berubah):
```bash
npm run start:dev
```

**Mode Production:**
```bash
npm run build && npm run start:prod
```

Server akan berjalan di: **`http://localhost:3000`**

---

## 📡 Dokumentasi Endpoint API

### Base URL: `http://localhost:3000/api`

---

### `GET /api/health`
Cek apakah server berjalan normal.

```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "message": "Media Downloader API is running 🚀",
  "uptime": 42.3,
  "version": "1.0.0"
}
```

---

### `GET /api/sites`
Daftar 100 situs pertama yang didukung oleh yt-dlp (total 1000+).

```bash
curl http://localhost:3000/api/sites
```

---

### `POST /api/extract`
**Universal downloader** — untuk YouTube, TikTok, Twitter/X, Facebook, Twitch, Reddit, Vimeo, dll.

| Field | Tipe | Wajib | Default | Keterangan |
|-------|------|-------|---------|------------|
| `url` | string | ✅ | — | URL video |
| `format` | string | ❌ | `mp4` | `mp4`, `mp3`, `best` |
| `quality` | string | ❌ | `best` | `best`, `1080`, `720`, `480`, `worst` |

**Contoh — Ambil CDN link YouTube 720p:**
```bash
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "format": "mp4",
    "quality": "720"
  }'
```

**Contoh — Ambil audio dari TikTok:**
```bash
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.tiktok.com/@username/video/1234567890",
    "format": "mp3"
  }'
```

**Response:**
```json
{
  "success": true,
  "platform": "youtube",
  "id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "duration": 212,
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "uploader": "Rick Astley",
  "cdn_urls": [
    {
      "type": "video",
      "url": "https://rr3---sn.googlevideo.com/videoplayback?...",
      "ext": "mp4",
      "resolution": "1280x720"
    },
    {
      "type": "audio",
      "url": "https://rr3---sn.googlevideo.com/videoplayback?...",
      "ext": "m4a"
    }
  ],
  "note": "Stream video dan audio terpisah. Gunakan ffmpeg untuk menggabungkan."
}
```

> **💡 Menggabungkan video+audio dengan FFmpeg:**
> ```bash
> ffmpeg -i "VIDEO_CDN_URL" -i "AUDIO_CDN_URL" -c copy output.mp4
> ```

---

### `POST /api/extract/info`
Ambil **metadata lengkap** tanpa link download (lebih cepat).

```bash
curl -X POST http://localhost:3000/api/extract/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Response:** Metadata + daftar semua format yang tersedia (id, resolusi, codec, ukuran file, dll).

---

### `POST /api/extract/audio`
Ekstrak **link CDN audio** (m4a/opus) langsung dari video.

| Field | Tipe | Wajib | Default | Keterangan |
|-------|------|-------|---------|------------|
| `url` | string | ✅ | — | URL video |
| `audioQuality` | string | ❌ | `192` | `128`, `192`, `256`, `320` |

```bash
curl -X POST http://localhost:3000/api/extract/audio \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtu.be/dQw4w9WgXcQ", "audioQuality": "320"}'
```

---

### `POST /api/instagram`
Ekstrak media dari **Instagram** (Post, Reels, Stories, Carousel).

| Field | Tipe | Wajib | Default | Keterangan |
|-------|------|-------|---------|------------|
| `url` | string | ✅ | — | URL post/reel Instagram |
| `type` | string | ❌ | `all` | `image`, `video`, `all` |

```bash
# Ambil semua media dari post carousel
curl -X POST http://localhost:3000/api/instagram \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.instagram.com/p/CxxxxxxXXXX/",
    "type": "all"
  }'
```

```bash
# Hanya gambar dari post
curl -X POST http://localhost:3000/api/instagram \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/p/CxxxxxxXXXX/", "type": "image"}'
```

**Response:**
```json
{
  "success": true,
  "platform": "instagram",
  "uploader": "username",
  "total_media": 3,
  "media": [
    { "type": "image", "url": "https://cdninstagram.com/...", "ext": "jpg" },
    { "type": "image", "url": "https://cdninstagram.com/...", "ext": "jpg" },
    { "type": "video", "url": "https://cdninstagram.com/...", "ext": "mp4" }
  ]
}
```

---

### `POST /api/spotify`
Ambil **informasi** lagu/album/playlist Spotify.

```bash
curl -X POST http://localhost:3000/api/spotify \
  -H "Content-Type: application/json" \
  -d '{"url": "https://open.spotify.com/track/4PTG3Z6ehGkBF2zI7Yg5xH"}'
```

---

### `POST /api/spotify/download`
**Download** lagu/album/playlist Spotify sebagai file **MP3** (dengan metadata: cover art, lirik, artist).

```bash
# Download satu lagu
curl -X POST http://localhost:3000/api/spotify/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://open.spotify.com/track/4PTG3Z6ehGkBF2zI7Yg5xH"}'

# Download seluruh playlist
curl -X POST http://localhost:3000/api/spotify/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://open.spotify.com/playlist/xxxxxxxxxxxxxxxx"}'
```

> ⚠️ Download playlist/album membutuhkan waktu lebih lama. File tersimpan di folder `downloads/spotify/`.

---

## 📁 Struktur Proyek

```
src/
├── main.ts                              # Entry point
├── app.module.ts                        # Root module
├── common/
│   └── filters/
│       └── http-exception.filter.ts    # Global error handler
└── downloader/
    ├── downloader.module.ts             # Module NestJS
    ├── downloader.controller.ts         # Semua endpoint API
    ├── downloader.service.ts            # Logic yt-dlp (universal)
    ├── instagram.service.ts             # Logic Instagram
    ├── spotify.service.ts               # Logic Spotify
    └── dto/
        ├── extract.dto.ts               # Validasi request /extract
        ├── instagram.dto.ts             # Validasi request /instagram
        └── spotify.dto.ts               # Validasi request /spotify
```

---

## ⚠️ Troubleshooting

### Error: `ffmpeg: command not found`
```bash
sudo apt install -y ffmpeg   # Ubuntu/Debian
```

### Error: `yt-dlp: command not found`
```bash
pip3 install yt-dlp --break-system-packages
```

### Instagram: `ERROR: 404 Not Found` atau `Login required`
- Ini terjadi untuk akun/post **private**. API ini hanya mendukung konten **public**.
- Untuk konten private, Anda perlu menambahkan cookie Instagram ke konfigurasi.

### Spotify: Download sangat lama
- Normal — `spotdl` mencari lagu di YouTube Music terlebih dahulu lalu mengonversinya.
- Untuk playlist besar, proses bisa memakan waktu berjam-jam.

### YouTube: `HTTP Error 429: Too Many Requests`
- Server Anda terkena rate limit. Coba tambahkan proxy di file `.env`.

---

## 📄 Lisensi

MIT License — Bebas digunakan untuk keperluan pribadi dan komersial.
