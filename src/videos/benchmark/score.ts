import type {BeatScore} from '../beat/score.ts';
import json from './score.json' with {type: 'json'};

export const benchmarkScore = json as unknown as BeatScore;
