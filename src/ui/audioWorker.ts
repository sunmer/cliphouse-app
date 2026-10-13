// Renders a template's mix off the main thread. Same code and inputs as the export server.
import {renderMusic, type MusicProps} from '../videos/music/index';
import type {Score} from '../videos/music/score';
import type {BeatScore} from '../videos/beat/score';
import {songAudio, type TemplateSong} from '../videos/song/index';

type Job = {id: number; score: Score; props: MusicProps} | {id: number; beat: BeatScore; song: TemplateSong; count: number};
self.onmessage = (event: MessageEvent<Job>) => {
  const job = event.data;
  const {left, right} = 'beat' in job ? songAudio(job.beat, job.song, job.count) : renderMusic(job.score, job.props);
  const id = job.id;
  (self as unknown as Worker).postMessage({id, left, right}, [left.buffer, right.buffer]);
};
