// Renders a music template's mix off the main thread. Same code and inputs as the export server.
import {renderMusic, type MusicProps} from '../videos/music/index';
import type {Score} from '../videos/music/score';

self.onmessage = (event: MessageEvent<{id: number; score: Score; props: MusicProps}>) => {
  const {id, score, props} = event.data;
  const {left, right} = renderMusic(score, props);
  (self as unknown as Worker).postMessage({id, left, right}, [left.buffer, right.buffer]);
};
