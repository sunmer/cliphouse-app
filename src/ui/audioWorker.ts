// Renders a template's mix off the main thread. Same code and inputs as the export server.
import {renderMusic, type MusicProps} from '../videos/music/index';
import type {Score} from '../videos/music/score';
import {beatAudio, type BeatScore} from '../videos/beat/index';

type Job = {id: number; score: Score; props: MusicProps} | {id: number; beat: BeatScore; count: number};
self.onmessage = (event: MessageEvent<Job>) => {
  const job = event.data;
  const {left, right} = 'beat' in job ? beatAudio(job.beat, job.count) : renderMusic(job.score, job.props);
  const id = job.id;
  (self as unknown as Worker).postMessage({id, left, right}, [left.buffer, right.buffer]);
};
