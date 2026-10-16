import type {BeatScore} from '../beat/score.ts';
import json from './score.json' with {type: 'json'};

export const featuredemoScore = json as unknown as BeatScore;
