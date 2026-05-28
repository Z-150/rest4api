const play = require('play-dl');
async function test() {
  console.time('play-dl playlist');
  const playlist = await play.playlist_info('https://www.youtube.com/playlist?list=PL4cUxeGgUsbi14g_3c77TfAks76k_H2O2');
  console.timeEnd('play-dl playlist');
  console.log(playlist.title);
}
test();
