import type {BeatScore} from '../beat/score.ts';
import json from './score.json' with {type: 'json'};

export const shippedScore = json as unknown as BeatScore;
