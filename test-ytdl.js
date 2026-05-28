const ytdl = require('@distube/ytdl-core');
console.time('ytdl-core');
ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ').then(info => {
  console.timeEnd('ytdl-core');
  console.log(info.videoDetails.title);
}).catch(console.error);
