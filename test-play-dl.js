const play = require('play-dl');

async function test() {
  console.time('play-dl video');
  try {
    const info = await play.video_info('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.timeEnd('play-dl video');
    console.log(info.video_details.title);
    console.log('Formats:', info.format.length);
  } catch (err) {
    console.error(err);
  }
}

test();
