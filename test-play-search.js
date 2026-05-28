const play = require('play-dl');
async function test() {
  console.time('play-dl search');
  const res = await play.search('Bohemian Rhapsody', { limit: 1 });
  console.timeEnd('play-dl search');
  console.log(res[0].title);
}
test();
